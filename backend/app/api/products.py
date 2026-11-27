import io
import logging
import re
import uuid
from typing import List, Optional
from pathlib import Path

from fastapi import APIRouter, Depends, File, Form, HTTPException, Query, UploadFile, status
from fastapi.responses import StreamingResponse
from PIL import Image as PilImage, ImageOps, UnidentifiedImageError
from sqlalchemy import asc, desc, or_
from sqlalchemy.orm import Session, selectinload

from app.core.config import settings
from app.core.security import get_current_admin, get_optional_admin, require_admin_for
from app.core.validators import like_pattern
from app.db.session import get_db
from app.models.category import Category
from app.models.order import OrderItem
from app.models.product_image import ProductImage
from app.models.product import Product
from app.services.category_tree import WORLDS, category_ids_in_world, descendant_ids
from app.services.palette import extract_palette, palette_to_str
from app.services.storage import delete_public_file, public_path
from app.schemas.product import (
    MODEL_TYPES,
    BulkCreatedItem,
    BulkRowError,
    BulkRowPreview,
    BulkUploadResult,
    GenerateSlugRequest,
    GenerateSlugResponse,
    ProductCreate,
    ProductImageRead,
    ProductImageReorderRequest,
    ProductListResponse,
    ProductRead,
    ProductUpdate,
)

log = logging.getLogger("app.products")

router = APIRouter(prefix="/products", tags=["products"])

ALLOWED_IMAGE_TYPES = {"image/jpeg", "image/png", "image/webp", "image/jpg"}
MAX_IMAGE_BYTES = 5 * 1024 * 1024  # 5 MB
ALLOWED_VIDEO_EXTS = {"mp4", "webm", "mov"}
MAX_VIDEO_BYTES = 50 * 1024 * 1024  # 50 MB
MAX_BULK_BYTES = 5 * 1024 * 1024
MAX_BULK_ROWS = 2000


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


def _process_and_save_image(content: bytes, upload_dir: Path, product_id: int) -> tuple[str, Optional[str]]:
    """
    Normalise an uploaded product image to a 1000×1000 square:
    - Apply the camera's EXIF rotation (phone photos otherwise appear sideways)
    - Scale to fit inside 1000×1000 (no crop, aspect ratio preserved)
    - Centre on a white canvas so all stored images are exactly square
    - Save as WebP quality=85 under a unique name (names must never be reused:
      sort orders change when images are deleted or reordered)
    Returns (public path, dominant-colour palette for the 3D preview).
    """
    try:
        img = PilImage.open(io.BytesIO(content))
        img = ImageOps.exif_transpose(img)
    except (UnidentifiedImageError, OSError, PilImage.DecompressionBombError):
        raise HTTPException(status_code=400, detail="That file is not a readable image.")

    # Flatten any transparency onto white
    if img.mode in ("RGBA", "LA") or (img.mode == "P" and "transparency" in img.info):
        img = img.convert("RGBA")
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

    full_name = f"product_{product_id}_{uuid.uuid4().hex[:12]}.webp"
    canvas.save(upload_dir / full_name, "WEBP", quality=85, optimize=True)
    try:
        palette = palette_to_str(extract_palette(canvas))
    except Exception:  # noqa: BLE001 — colours are a nice-to-have, never fail the upload
        palette = None
    return public_path("uploads", settings.PRODUCT_SUBDIR, full_name), palette


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
# Bulk Excel upload
# ─────────────────────────────────────────────────────────────

# Column headers (case-insensitive) recognised in the Excel file
_BULK_COLUMNS = [
    "name", "slug", "description", "benefits",
    "price", "mrp", "badge", "category", "stock",
    "status", "3d_model", "photos",
]
# Friendlier header spellings people type by hand
_BULK_ALIASES = {
    "product name": "name", "product": "name",
    "images": "photos", "image": "photos", "photo": "photos", "photo files": "photos",
    "3d model": "3d_model", "3d": "3d_model", "model": "3d_model", "3d view": "3d_model",
    "published": "status", "visibility": "status",
    "quantity": "stock", "qty": "stock",
}
_STATUS_PUBLISHED = {"published", "publish", "live", "yes", "y", "active", "show", "1", "true"}
_STATUS_DRAFT = {"draft", "hidden", "hide", "no", "n", "inactive", "0", "false"}
_PHOTO_SPLIT = re.compile(r"[,;\n]+")


def _clean_cell(v) -> Optional[str]:
    if v is None:
        return None
    s = str(v).strip()
    return s or None


def _to_number(v, field: str = "value"):
    if v is None or (isinstance(v, str) and not v.strip()):
        return None
    try:
        n = float(v)
    except (TypeError, ValueError):
        raise ValueError(f"{field} '{v}' is not a valid number")
    if n < 0:
        raise ValueError(f"{field} cannot be negative")
    return n


@router.get("/bulk-template")
def bulk_template(db: Session = Depends(get_db), _: str = Depends(get_current_admin)):
    """Download a ready-to-fill .xlsx template: products sheet with dropdowns,
    plain-language instructions, and the shop's current category names."""
    from openpyxl import Workbook
    from openpyxl.styles import Alignment, Font, PatternFill
    from openpyxl.worksheet.datavalidation import DataValidation

    categories = sorted(c.name for c in db.query(Category).all() if c.name)

    wb = Workbook()
    ws = wb.active
    ws.title = "Products"
    ws.append(_BULK_COLUMNS)
    ws.append([
        "Natural Amethyst Bracelet", "", "Genuine amethyst crystal bracelet, 8 mm beads.",
        "Calms the mind, aids intuition.", 1499, 2499, "Bestseller",
        categories[0] if categories else "", -1, "Published", "auto",
        "Natural Amethyst Bracelet 1.jpg, Natural Amethyst Bracelet 2.jpg",
    ])
    ws.append([
        "Yellow Sapphire 5 Ratti", "", "Certified natural yellow sapphire.",
        "", 15500, "", "Certified", "", 1, "Draft", "gemstone", "",
    ])
    head_fill = PatternFill("solid", fgColor="1D3D2C")
    for cell in ws[1]:
        cell.font = Font(bold=True, color="FFFFFF")
        cell.fill = head_fill
    widths = {"name": 30, "description": 40, "benefits": 32, "photos": 48, "category": 20}
    for i, col in enumerate(_BULK_COLUMNS, start=1):
        ws.column_dimensions[chr(64 + i)].width = widths.get(col, max(12, len(col) + 4))
    ws.freeze_panes = "A2"

    def col_letter(name: str) -> str:
        return chr(65 + _BULK_COLUMNS.index(name))

    last = MAX_BULK_ROWS + 1
    status_dv = DataValidation(type="list", formula1='"Published,Draft"', allow_blank=True)
    model_dv = DataValidation(type="list", formula1='"' + ",".join(MODEL_TYPES) + '"', allow_blank=True)
    ws.add_data_validation(status_dv)
    ws.add_data_validation(model_dv)
    status_dv.add(f"{col_letter('status')}2:{col_letter('status')}{last}")
    model_dv.add(f"{col_letter('3d_model')}2:{col_letter('3d_model')}{last}")

    cats = wb.create_sheet("Categories")
    cats.append(["Category names you can use"])
    cats["A1"].font = Font(bold=True)
    for name in categories:
        cats.append([name])
    cats.column_dimensions["A"].width = 34
    if categories:
        cat_dv = DataValidation(type="list", formula1=f"=Categories!$A$2:$A${len(categories) + 1}",
                                allow_blank=True)
        cat_dv.error = "Pick a category from the list (see the Categories sheet)."
        ws.add_data_validation(cat_dv)
        cat_dv.add(f"{col_letter('category')}2:{col_letter('category')}{last}")

    howto = wb.create_sheet("How to")
    lines = [
        ("How to add many products at once", True),
        ("", False),
        ("1. Fill one row per product on the Products sheet. Only 'name' is required. Delete the two example rows.", False),
        ("2. price / mrp: numbers only (no ₹ sign). mrp is the original price: when it is higher than price, the product shows as on sale. Leave price empty for 'Price on request'.", False),
        ("3. category: pick from the dropdown (the list is on the Categories sheet). Leave empty if unsure.", False),
        ("4. stock: leave empty or -1 if you don't count stock. Type a number (e.g. 5) to track it; 0 means out of stock.", False),
        ("5. status: Published shows the product on the website; Draft keeps it hidden until you publish it.", False),
        ("6. 3d_model: the 360° 3D view on the product page. 'auto' picks the shape from the product name. You can also choose bracelet, mala, gemstone, crystal or raw, or none to switch it off.", False),
        ("", False),
        ("Photos (up to 4 per product; the first one is the main photo)", True),
        ("Easiest: name each photo file after the product, e.g. 'Natural Amethyst Bracelet 1.jpg', 'Natural Amethyst Bracelet 2.jpg'. Or put each product's photos in a folder named after the product.", False),
        ("Then, on the Bulk upload page, choose this Excel file and drop all the photos in. They are matched to the right products automatically, and you can check everything before saving.", False),
        ("Optional: type exact file names in the 'photos' column, separated by commas.", False),
        ("", False),
        ("slug is the product's web address. Leave it empty and it is made from the name.", False),
    ]
    for text_, bold in lines:
        howto.append([text_])
        if bold:
            howto.cell(row=howto.max_row, column=1).font = Font(bold=True, size=12)
    howto.column_dimensions["A"].width = 120
    for row in howto.iter_rows():
        for cell in row:
            cell.alignment = Alignment(wrap_text=True, vertical="top")

    buf = io.BytesIO()
    wb.save(buf)
    buf.seek(0)
    return StreamingResponse(
        buf,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": 'attachment; filename="bhaktijyot_products_template.xlsx"'},
    )


def _photo_names(value) -> List[str]:
    """'a.jpg, folder/b.png' -> ['a.jpg', 'b.png'] (base names only, de-duplicated)."""
    text_ = _clean_cell(value)
    if not text_:
        return []
    out: List[str] = []
    for part in _PHOTO_SPLIT.split(text_):
        name = part.strip().replace("\\", "/").rsplit("/", 1)[-1].strip()
        if name and name not in out:
            out.append(name)
    return out


def _bulk_header_key(cell) -> Optional[str]:
    raw = (_clean_cell(cell) or "").lower().strip()
    if raw in _BULK_COLUMNS:
        return raw
    spaced = raw.replace("_", " ")
    if spaced.replace(" ", "_") in _BULK_COLUMNS:
        return spaced.replace(" ", "_")
    return _BULK_ALIASES.get(spaced)


@router.post("/bulk-upload", response_model=BulkUploadResult)
async def bulk_upload(
    file: UploadFile = File(...),
    dry_run: bool = Query(False, description="Parse and validate only; nothing is saved"),
    hold_rows: Optional[str] = Form(
        default=None,
        description="JSON list of row numbers to create as drafts until their photos are uploaded",
    ),
    db: Session = Depends(get_db),
    _: str = Depends(get_current_admin),
):
    """Create many products at once from an uploaded .xlsx file.

    With dry_run=true the rows are parsed and validated and returned for review;
    nothing is saved. Rows listed in hold_rows are created hidden and marked
    publish_after_photos, so the admin client publishes them only after their
    photos have uploaded (a product never goes live half-finished)."""
    import json

    from openpyxl import load_workbook

    fname = (file.filename or "").lower()
    if not fname.endswith((".xlsx", ".xlsm")):
        raise HTTPException(status_code=400, detail="Please upload a .xlsx Excel file")

    content = await file.read(MAX_BULK_BYTES + 1)
    if len(content) > MAX_BULK_BYTES:
        raise HTTPException(status_code=400, detail="The Excel file is too large (max 5 MB).")
    try:
        wb = load_workbook(io.BytesIO(content), read_only=True, data_only=True)
    except Exception:
        raise HTTPException(status_code=400, detail="Could not read the Excel file")
    # The template's product sheet is "Products"; otherwise use the active sheet
    ws = wb["Products"] if "Products" in wb.sheetnames else wb.active

    rows = list(ws.iter_rows(values_only=True))
    if not rows:
        raise HTTPException(status_code=400, detail="The sheet is empty")
    if len(rows) > MAX_BULK_ROWS + 1:
        raise HTTPException(status_code=400, detail=f"Too many rows — upload at most {MAX_BULK_ROWS} products at a time.")

    hold: set[int] = set()
    if hold_rows:
        try:
            hold = {int(r) for r in json.loads(hold_rows)}
        except (ValueError, TypeError):
            raise HTTPException(status_code=400, detail="hold_rows must be a JSON list of row numbers")

    # Map header names → column index (case-insensitive, with friendly aliases)
    col_index: dict[str, int] = {}
    for i, cell in enumerate(rows[0]):
        key = _bulk_header_key(cell)
        if key and key not in col_index:
            col_index[key] = i
    if "name" not in col_index:
        raise HTTPException(
            status_code=400,
            detail="Missing required 'name' column. Download the template for the correct format.",
        )

    # Category lookup by name or slug (case-insensitive)
    cat_lookup: dict[str, tuple[int, str]] = {}
    for cat in db.query(Category).all():
        cat_lookup[cat.name.strip().lower()] = (cat.id, cat.name)
        if cat.slug:
            cat_lookup[cat.slug.strip().lower()] = (cat.id, cat.name)

    # Existing slugs (DB) + slugs claimed within this batch
    used_slugs = {row_[0] for row_ in db.query(Product.slug).all()}

    def get(row, key):
        idx = col_index.get(key)
        return row[idx] if idx is not None and idx < len(row) else None

    def unique_slug(base: str) -> str:
        slug = base or "product"
        candidate = slug
        n = 2
        while candidate in used_slugs:
            candidate = f"{slug}-{n}"
            n += 1
        used_slugs.add(candidate)
        return candidate

    parsed: List[dict] = []
    errors: List[BulkRowError] = []

    for offset, row in enumerate(rows[1:], start=2):  # row 1 is the header
        if row is None or all(c is None or str(c).strip() == "" for c in row):
            continue  # fully blank row
        item = {"row": offset, "name": _clean_cell(get(row, "name"))}
        try:
            if not item["name"]:
                raise ValueError("Missing product name")
            if len(item["name"]) > 255:
                raise ValueError("Product name is longer than 255 characters")

            category_id, category_name = None, None
            cat_val = _clean_cell(get(row, "category"))
            if cat_val:
                found = cat_lookup.get(cat_val.lower())
                if found is None:
                    raise ValueError(f"Unknown category '{cat_val}' (see the Categories sheet in the template)")
                category_id, category_name = found

            stock_raw = get(row, "stock")
            stock_val = -1
            if stock_raw is not None and str(stock_raw).strip() != "":
                try:
                    stock_val = int(float(stock_raw))
                except (TypeError, ValueError):
                    raise ValueError(f"stock '{stock_raw}' is not a whole number")
                if stock_val < -1:
                    raise ValueError("stock must be -1 (not tracked) or 0 and above")

            status_raw = (_clean_cell(get(row, "status")) or "published").lower()
            if status_raw in _STATUS_PUBLISHED:
                is_active = True
            elif status_raw in _STATUS_DRAFT:
                is_active = False
            else:
                raise ValueError(f"status '{status_raw}' should be Published or Draft")

            model_raw = (_clean_cell(get(row, "3d_model")) or "auto").lower()
            if model_raw not in MODEL_TYPES:
                raise ValueError(f"3d_model '{model_raw}' should be one of: {', '.join(MODEL_TYPES)}")

            badge = _clean_cell(get(row, "badge"))
            if badge and len(badge) > 100:
                raise ValueError("badge is longer than 100 characters")

            price = _to_number(get(row, "price"), "price")
            mrp = _to_number(get(row, "mrp"), "mrp")

            slug_src = _clean_cell(get(row, "slug"))
            slug_val = unique_slug(_make_slug(slug_src) if slug_src else _make_slug(item["name"]))

            item.update({
                "slug": slug_val, "category": category_name, "category_id": category_id,
                "price": price, "mrp": mrp, "stock": stock_val, "badge": badge,
                "status": "published" if is_active else "draft", "is_active": is_active,
                "model_type": model_raw, "photos": _photo_names(get(row, "photos")),
                "description": _clean_cell(get(row, "description")),
                "benefits": _clean_cell(get(row, "benefits")),
            })
        except Exception as exc:  # noqa: BLE001 — report the row, keep going
            item["error"] = str(exc)
            errors.append(BulkRowError(row=offset, error=str(exc)))
        parsed.append(item)

    ok_rows = [it for it in parsed if not it.get("error")]
    previews = [
        BulkRowPreview(**{k: v for k, v in it.items() if k in BulkRowPreview.model_fields})
        for it in parsed
    ]

    if dry_run:
        return BulkUploadResult(
            dry_run=True, created=0, skipped=len(parsed) - len(ok_rows),
            errors=errors, rows=previews,
        )

    created: List[tuple[dict, Product, bool]] = []
    for it in ok_rows:
        held = it["row"] in hold and it["is_active"]
        product = Product(
            name=it["name"], slug=it["slug"],
            description=it["description"], benefits=it["benefits"],
            price=it["price"], mrp=it["mrp"], badge=it["badge"],
            category_id=it["category_id"], stock=it["stock"],
            is_active=it["is_active"] and not held,
            model_type=None if it["model_type"] == "auto" else it["model_type"],
        )
        db.add(product)
        created.append((it, product, held))

    items: List[BulkCreatedItem] = []
    if created:
        db.flush()  # assign ids
        items = [
            BulkCreatedItem(row=it["row"], id=prod.id, name=prod.name, slug=prod.slug,
                            is_active=prod.is_active, publish_after_photos=held)
            for it, prod, held in created
        ]
        db.commit()

    return BulkUploadResult(
        created=len(items),
        skipped=len(parsed) - len(ok_rows),
        created_products=[i.name for i in items],
        errors=errors,
        rows=previews,
        created_items=items,
    )


# ─────────────────────────────────────────────────────────────
# Public listing endpoints
# ─────────────────────────────────────────────────────────────

@router.get("", response_model=List[ProductRead])
def list_products(
    category_id: Optional[int] = None,
    include_inactive: bool = False,
    db: Session = Depends(get_db),
    is_admin: bool = Depends(get_optional_admin),
):
    require_admin_for(include_inactive, is_admin, "draft products")
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
    world: Optional[str] = None,
    on_sale: Optional[bool] = None,
    page: int = 1,
    limit: int = 24,
    db: Session = Depends(get_db),
    is_admin: bool = Depends(get_optional_admin),
):
    require_admin_for(include_inactive, is_admin, "draft products")
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
        # A parent category includes everything in its subcategories
        query = query.filter(Product.category_id.in_(descendant_ids(db, category_id)))

    if world:
        if world not in WORLDS:
            raise HTTPException(status_code=400, detail=f"world must be one of: {', '.join(WORLDS)}")
        world_ids = category_ids_in_world(db, world)
        # Until an admin assigns categories to this world, show the full catalogue
        # rather than an empty page.
        if world_ids:
            query = query.filter(Product.category_id.in_(world_ids))

    if on_sale:
        query = query.filter(
            Product.price.isnot(None), Product.mrp.isnot(None), Product.mrp > Product.price
        )

    if min_price is not None:
        query = query.filter(Product.price >= min_price)

    if max_price is not None:
        query = query.filter(Product.price <= max_price)

    if in_stock is True:
        query = query.filter(Product.stock != 0)

    if search and search.strip():
        pat = like_pattern(search)  # % and _ typed by users are matched literally
        query = query.filter(
            or_(
                Product.name.ilike(pat, escape="\\"),
                Product.slug.ilike(pat, escape="\\"),
                Product.description.ilike(pat, escape="\\"),
                Product.benefits.ilike(pat, escape="\\"),
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
def get_product(
    product_id: int,
    db: Session = Depends(get_db),
    is_admin: bool = Depends(get_optional_admin),
):
    product = _load_product(product_id, db)
    if product.is_active is False and not is_admin:
        raise HTTPException(status_code=404, detail="Product not found")
    return product


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
    product = _load_product(product_id, db)
    if db.query(OrderItem.id).filter(OrderItem.product_id == product_id).first():
        raise HTTPException(
            status_code=409,
            detail="This product has orders, so it can't be deleted (order history needs it). "
                   "Unpublish it instead by setting it to Draft.",
        )
    files = [img.image_path for img in product.images] + [product.image_path, product.video_path]
    db.delete(product)
    db.commit()
    for f in set(filter(None, files)):
        delete_public_file(f)
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
            # Read at most limit+1 bytes so an oversized upload is rejected cheaply
            content = await fobj.read(MAX_IMAGE_BYTES + 1)

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
            saved_path, palette = _process_and_save_image(content, upload_dir, product_id)

            db.add(
                ProductImage(
                    product_id=product_id,
                    image_path=saved_path,
                    sort_order=sort_order,
                    palette=palette,
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
        video_ext = (Path(video.filename).suffix.lstrip(".") if video.filename else "").lower()
        ct = (video.content_type or "").lower()
        if video_ext not in ALLOWED_VIDEO_EXTS or not ct.startswith("video/"):
            raise HTTPException(status_code=400, detail="Video must be an MP4, WebM or MOV file.")
        content = await video.read(MAX_VIDEO_BYTES + 1)
        if len(content) > MAX_VIDEO_BYTES:
            raise HTTPException(status_code=400, detail="Video exceeds the 50 MB limit.")
        video_name = f"product_{product_id}_video_{uuid.uuid4().hex[:10]}.{video_ext}"
        (upload_dir / video_name).write_bytes(content)
        old_video = product.video_path
        product.video_path = public_path("uploads", settings.PRODUCT_SUBDIR, video_name)
        if old_video and old_video != product.video_path:
            delete_public_file(old_video)

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

    # Delete the file (and a legacy thumbnail, if one was ever made)
    delete_public_file(image.image_path)
    stem = image.image_path.rsplit(".", 1)[0]
    delete_public_file(f"{stem}_thumb.webp")

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

    images = (
        db.query(ProductImage)
        .filter(ProductImage.product_id == product_id)
        .order_by(ProductImage.sort_order.asc(), ProductImage.id.asc())
        .all()
    )
    chosen = next((img for img in images if img.id == image_id), None)
    if chosen is None:
        raise HTTPException(status_code=404, detail="Image not found")

    # "Primary" means first everywhere: move it to position 0, keep the rest in order
    ordered = [chosen] + [img for img in images if img.id != image_id]
    for idx, img in enumerate(ordered):
        img.sort_order = idx
    product.image_path = chosen.image_path
    db.commit()
    return _load_product(product_id, db)
