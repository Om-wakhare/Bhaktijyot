import io
import re
from typing import List, Optional
from pathlib import Path
from pathlib import PurePosixPath

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile, status
from PIL import Image as PilImage
from sqlalchemy import asc, desc, or_, and_
from sqlalchemy.orm import Session, selectinload

from app.core.config import settings
from app.core.security import get_current_admin
from app.db.session import get_db
from app.models.product_image import ProductImage
from app.models.product import Product
from app.schemas.product import (
    GenerateSlugRequest,
    GenerateSlugResponse,
    ProductCreate,
    ProductImageRead,
    ProductImageReorderRequest,
    ProductListResponse,
    ProductRead,
    ProductUpdate,
)

router = APIRouter(prefix="/products", tags=["products"])

ALLOWED_IMAGE_TYPES = {"image/jpeg", "image/png", "image/webp", "image/jpg"}
MAX_IMAGE_BYTES = 5 * 1024 * 1024  # 5 MB


def _load_product(product_id: int, db: Session) -> Product:
    product = (
        db.query(Product)
        .options(selectinload(Product.images), selectinload(Product.category))
        .filter(Product.id == product_id)
        .first()
    )
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    return product


def _make_slug(name: str) -> str:
    slug = name.lower().strip()
    slug = re.sub(r"[^\w\s-]", "", slug)
    slug = re.sub(r"[\s_]+", "-", slug)
    slug = re.sub(r"-+", "-", slug)
    return slug.strip("-")


_PRODUCT_SIZE = 1000  # all product images are stored as 1000×1000 squares


def _process_and_save_image(
    content: bytes, upload_dir: Path, product_id: int, sort_order: int
) -> str:
    """
    Normalise an uploaded product image to a 1000×1000 square:
    - Scale to fit inside 1000×1000 (no crop, aspect ratio preserved)
    - Centre on a white canvas so all stored images are exactly square
    - Save as WebP quality=85
    """
    img = PilImage.open(io.BytesIO(content))

    # Flatten transparency onto white
    if img.mode == "RGBA":
        bg = PilImage.new("RGB", img.size, (255, 255, 255))
        bg.paste(img, mask=img.split()[3])
        img = bg
    elif img.mode != "RGB":
        img = img.convert("RGB")

    # Scale to fit within the target square, preserving aspect ratio
    img.thumbnail((_PRODUCT_SIZE, _PRODUCT_SIZE), PilImage.LANCZOS)

    # Centre on a white square canvas
    canvas = PilImage.new("RGB", (_PRODUCT_SIZE, _PRODUCT_SIZE), (255, 255, 255))
    offset_x = (_PRODUCT_SIZE - img.width) // 2
    offset_y = (_PRODUCT_SIZE - img.height) // 2
    canvas.paste(img, (offset_x, offset_y))

    full_name = f"product_{product_id}_{sort_order}.webp"
    full_path = upload_dir / full_name
    canvas.save(full_path, "WEBP", quality=85, optimize=True)

    return str(
        PurePosixPath("static") / "uploads" / settings.PRODUCT_SUBDIR / full_name
    )


# ─────────────────────────────────────────────────────────────
# Slug generation (admin only)
# ─────────────────────────────────────────────────────────────

@router.post("/generate-slug", response_model=GenerateSlugResponse)
def generate_slug(
    payload: GenerateSlugRequest,
    _: str = Depends(get_current_admin),
):
    return GenerateSlugResponse(slug=_make_slug(payload.name))


# ─────────────────────────────────────────────────────────────
# Public listing endpoints
# ─────────────────────────────────────────────────────────────

@router.get("", response_model=List[ProductRead])
def list_products(
    category_id: Optional[int] = None,
    include_inactive: bool = False,
    db: Session = Depends(get_db),
):
    query = db.query(Product).options(
        selectinload(Product.images), selectinload(Product.category)
    )
    if not include_inactive:
        query = query.filter(Product.is_active.isnot(False))  # NULL treated as active
    if category_id is not None:
        query = query.filter(Product.category_id == category_id)
    return query.order_by(asc(Product.sort_order), desc(Product.created_at)).all()


@router.get("/catalog", response_model=ProductListResponse)
def catalog_products(
    search: Optional[str] = None,
    category_id: Optional[int] = None,
    min_price: Optional[float] = None,
    max_price: Optional[float] = None,
    sort: str = "newest",
    in_stock: Optional[bool] = None,
    include_inactive: bool = False,
    page: int = 1,
    limit: int = 24,
    db: Session = Depends(get_db),
):
    if page < 1:
        raise HTTPException(status_code=400, detail="page must be >= 1")
    if limit < 1 or limit > 100:
        raise HTTPException(status_code=400, detail="limit must be between 1 and 100")

    query = db.query(Product).options(
        selectinload(Product.images), selectinload(Product.category)
    )

    if not include_inactive:
        query = query.filter(Product.is_active.isnot(False))  # NULL treated as active

    if category_id is not None:
        query = query.filter(Product.category_id == category_id)

    if min_price is not None:
        query = query.filter(Product.price >= min_price)

    if max_price is not None:
        query = query.filter(Product.price <= max_price)

    if in_stock is True:
        query = query.filter(Product.stock != 0)

    if search:
        s = f"%{search.strip()}%"
        query = query.filter(
            or_(
                Product.name.ilike(s),
                Product.slug.ilike(s),
                Product.description.ilike(s),
                Product.benefits.ilike(s),
            )
        )

    total = query.count()

    sort_key = (sort or "newest").lower()
    if sort_key == "newest":
        query = query.order_by(asc(Product.sort_order), desc(Product.created_at), desc(Product.id))
    elif sort_key == "oldest":
        query = query.order_by(asc(Product.created_at), asc(Product.id))
    elif sort_key in {"price_asc", "price_low", "price_low_to_high"}:
        query = query.order_by(asc(Product.price).nullslast(), desc(Product.created_at))
    elif sort_key in {"price_desc", "price_high", "price_high_to_low"}:
        query = query.order_by(desc(Product.price).nullslast(), desc(Product.created_at))
    elif sort_key in {"name_asc", "name"}:
        query = query.order_by(asc(Product.name), desc(Product.created_at))
    elif sort_key == "rating":
        query = query.order_by(desc(Product.rating_avg).nullslast(), desc(Product.rating_count))
    else:
        raise HTTPException(status_code=400, detail="invalid sort")

    offset = (page - 1) * limit
    items = query.offset(offset).limit(limit).all()

    return ProductListResponse(items=items, page=page, limit=limit, total=total)


# ─────────────────────────────────────────────────────────────
# Fetch by slug (public — only active products)
# ─────────────────────────────────────────────────────────────

@router.get("/slug/{slug}", response_model=ProductRead)
def get_product_by_slug(slug: str, db: Session = Depends(get_db)):
    product = (
        db.query(Product)
        .options(selectinload(Product.images), selectinload(Product.category))
        .filter(Product.slug == slug, Product.is_active.isnot(False))
        .first()
    )
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    return product


# ─────────────────────────────────────────────────────────────
# Fetch by ID (public — allows draft preview by direct ID)
# ─────────────────────────────────────────────────────────────

@router.get("/{product_id}", response_model=ProductRead)
def get_product(product_id: int, db: Session = Depends(get_db)):
    return _load_product(product_id, db)


# ─────────────────────────────────────────────────────────────
# Related products
# ─────────────────────────────────────────────────────────────

@router.get("/{product_id}/related", response_model=List[ProductRead])
def get_related_products(
    product_id: int,
    limit: int = 4,
    db: Session = Depends(get_db),
):
    product = db.query(Product).filter(Product.id == product_id).first()
    if not product or not product.category_id:
        return []
    related = (
        db.query(Product)
        .options(selectinload(Product.images), selectinload(Product.category))
        .filter(
            Product.category_id == product.category_id,
            Product.id != product_id,
            Product.is_active.isnot(False),
        )
        .order_by(asc(Product.sort_order), desc(Product.created_at))
        .limit(limit)
        .all()
    )
    return related


# ─────────────────────────────────────────────────────────────
# Admin — CRUD
# ─────────────────────────────────────────────────────────────

@router.post("", response_model=ProductRead, status_code=status.HTTP_201_CREATED)
def create_product(
    payload: ProductCreate,
    db: Session = Depends(get_db),
    _: str = Depends(get_current_admin),
):
    existing = db.query(Product).filter(Product.slug == payload.slug).first()
    if existing:
        raise HTTPException(status_code=409, detail="Product slug already exists")
    product = Product(**payload.model_dump())
    db.add(product)
    db.commit()
    db.refresh(product)
    return _load_product(product.id, db)


@router.put("/{product_id}", response_model=ProductRead)
def update_product(
    product_id: int,
    payload: ProductUpdate,
    db: Session = Depends(get_db),
    _: str = Depends(get_current_admin),
):
    product = db.query(Product).filter(Product.id == product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")

    updates = payload.model_dump(exclude_unset=True)
    if "slug" in updates and updates["slug"] is not None:
        existing = (
            db.query(Product)
            .filter(Product.slug == updates["slug"], Product.id != product_id)
            .first()
        )
        if existing:
            raise HTTPException(status_code=409, detail="Product slug already exists")

    for field, value in updates.items():
        setattr(product, field, value)

    db.commit()
    return _load_product(product_id, db)


@router.delete("/{product_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_product(
    product_id: int,
    db: Session = Depends(get_db),
    _: str = Depends(get_current_admin),
):
    product = db.query(Product).filter(Product.id == product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    db.delete(product)
    db.commit()
    return None


# ─────────────────────────────────────────────────────────────
# Admin — Image management
# ─────────────────────────────────────────────────────────────

@router.get("/{product_id}/images", response_model=List[ProductImageRead])
def list_product_images(product_id: int, db: Session = Depends(get_db)):
    product = db.query(Product).filter(Product.id == product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    return (
        db.query(ProductImage)
        .filter(ProductImage.product_id == product_id)
        .order_by(ProductImage.sort_order.asc(), ProductImage.id.asc())
        .all()
    )


@router.post("/{product_id}/media", response_model=ProductRead)
async def upload_product_media(
    product_id: int,
    image: Optional[UploadFile] = File(default=None),
    images: Optional[List[UploadFile]] = File(default=None),
    video: Optional[UploadFile] = File(default=None),
    db: Session = Depends(get_db),
    _: str = Depends(get_current_admin),
):
    product = db.query(Product).filter(Product.id == product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")

    upload_dir = settings.UPLOAD_DIR / settings.PRODUCT_SUBDIR
    upload_dir.mkdir(parents=True, exist_ok=True)

    incoming_images: list[UploadFile] = []
    if images:
        incoming_images.extend([f for f in images if f is not None])
    if image is not None:
        incoming_images.append(image)

    if incoming_images:
        existing_count = (
            db.query(ProductImage).filter(ProductImage.product_id == product_id).count()
        )
        available_slots = 4 - existing_count
        if available_slots <= 0:
            raise HTTPException(status_code=400, detail="Maximum 4 images allowed per product")
        if len(incoming_images) > available_slots:
            raise HTTPException(
                status_code=400,
                detail=f"You can upload only {available_slots} more image(s) for this product",
            )

        next_sort = (
            db.query(ProductImage)
            .filter(ProductImage.product_id == product_id)
            .order_by(ProductImage.sort_order.desc())
            .first()
        )
        sort_order = (next_sort.sort_order + 1) if next_sort else 0

        for fobj in incoming_images:
            # Read content into memory for validation + processing
            content = await fobj.read()

            # Validate MIME type
            ct = (fobj.content_type or "").lower()
            if ct not in ALLOWED_IMAGE_TYPES:
                raise HTTPException(
                    status_code=400,
                    detail=f"'{fobj.filename}' is not an allowed image type. Use JPEG, PNG, or WebP.",
                )

            # Validate file size
            if len(content) > MAX_IMAGE_BYTES:
                raise HTTPException(
                    status_code=400,
                    detail=f"'{fobj.filename}' exceeds the 5 MB limit.",
                )

            # Process with Pillow and save as WebP
            public_path = _process_and_save_image(content, upload_dir, product_id, sort_order)

            db.add(
                ProductImage(
                    product_id=product_id,
                    image_path=public_path,
                    sort_order=sort_order,
                )
            )
            sort_order += 1

        db.flush()

        if not product.image_path:
            first = (
                db.query(ProductImage)
                .filter(ProductImage.product_id == product_id)
                .order_by(ProductImage.sort_order.asc())
                .first()
            )
            if first:
                product.image_path = first.image_path

    if video is not None:
        video_ext = Path(video.filename).suffix.lstrip(".") if video.filename else "mp4"
        video_name = f"product_{product_id}_video.{video_ext}"
        video_path = upload_dir / video_name
        content = await video.read()
        with video_path.open("wb") as f:
            f.write(content)
        product.video_path = str(
            PurePosixPath("static") / "uploads" / settings.PRODUCT_SUBDIR / video_name
        )

    db.commit()
    return _load_product(product_id, db)


@router.delete(
    "/{product_id}/images/{image_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
def delete_product_image(
    product_id: int,
    image_id: int,
    db: Session = Depends(get_db),
    _: str = Depends(get_current_admin),
):
    product = db.query(Product).filter(Product.id == product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")

    image = (
        db.query(ProductImage)
        .filter(ProductImage.id == image_id, ProductImage.product_id == product_id)
        .first()
    )
    if not image:
        raise HTTPException(status_code=404, detail="Image not found")

    # Delete main file and thumbnail
    upload_dir = settings.UPLOAD_DIR / settings.PRODUCT_SUBDIR
    for filename in [
        Path(image.image_path).name,
        Path(image.image_path).stem + "_thumb.webp",
    ]:
        disk_path = upload_dir / filename
        try:
            if disk_path.exists() and disk_path.is_file():
                disk_path.unlink()
        except Exception:
            pass

    was_primary = product.image_path == image.image_path

    db.delete(image)
    db.commit()

    remaining = (
        db.query(ProductImage)
        .filter(ProductImage.product_id == product_id)
        .order_by(ProductImage.sort_order.asc(), ProductImage.id.asc())
        .all()
    )

    for idx, img in enumerate(remaining):
        img.sort_order = idx

    if not remaining:
        product.image_path = None
    elif was_primary:
        product.image_path = remaining[0].image_path

    db.commit()
    return None


@router.put("/{product_id}/images/reorder", response_model=List[ProductImageRead])
def reorder_product_images(
    product_id: int,
    payload: ProductImageReorderRequest,
    db: Session = Depends(get_db),
    _: str = Depends(get_current_admin),
):
    product = db.query(Product).filter(Product.id == product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")

    images = (
        db.query(ProductImage)
        .filter(ProductImage.product_id == product_id)
        .order_by(ProductImage.sort_order.asc(), ProductImage.id.asc())
        .all()
    )
    existing_ids = {img.id for img in images}
    incoming_ids = payload.image_ids

    if len(incoming_ids) != len(existing_ids) or set(incoming_ids) != existing_ids:
        raise HTTPException(status_code=400, detail="image_ids must match existing images exactly")

    id_to_img = {img.id: img for img in images}
    for idx, img_id in enumerate(incoming_ids):
        id_to_img[img_id].sort_order = idx

    product.image_path = id_to_img[incoming_ids[0]].image_path if incoming_ids else None

    db.commit()
    return (
        db.query(ProductImage)
        .filter(ProductImage.product_id == product_id)
        .order_by(ProductImage.sort_order.asc(), ProductImage.id.asc())
        .all()
    )


@router.put(
    "/{product_id}/images/set-primary/{image_id}",
    response_model=ProductRead,
)
def set_primary_product_image(
    product_id: int,
    image_id: int,
    db: Session = Depends(get_db),
    _: str = Depends(get_current_admin),
):
    product = db.query(Product).filter(Product.id == product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")

    image = (
        db.query(ProductImage)
        .filter(ProductImage.id == image_id, ProductImage.product_id == product_id)
        .first()
    )
    if not image:
        raise HTTPException(status_code=404, detail="Image not found")

    product.image_path = image.image_path
    db.commit()
    return _load_product(product_id, db)
