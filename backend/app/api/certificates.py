import json
import uuid
from pathlib import Path
from pathlib import PurePosixPath
from typing import Any, Dict, Optional

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile, status
from sqlalchemy import or_
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.security import get_current_admin
from app.db.session import get_db
from app.models.certificate import Certificate
from app.schemas.certificate import CertificateListResponse, CertificateRead
from app.services.certificate_renderer import generate_certificate_image

router = APIRouter(prefix="/certificates", tags=["certificates"])


def _delete_static_file(public_path: Optional[str]) -> None:
    if not public_path:
        return
    try:
        filename = Path(public_path).name
        if public_path.startswith("static/uploads"):
            disk_path = settings.UPLOAD_DIR / filename
            # handle subfolders
            disk_path = settings.BASE_DIR / public_path
        elif public_path.startswith("static/generated"):
            disk_path = settings.BASE_DIR / public_path
        else:
            return
        if disk_path.exists() and disk_path.is_file():
            disk_path.unlink()
    except Exception:
        return


@router.post(
    "",
    response_model=CertificateRead,
    status_code=status.HTTP_201_CREATED,
)
async def create_certificate(
    background_image: UploadFile = File(...),
    product_image: Optional[UploadFile] = File(default=None),
    certificate_data: Optional[str] = Form(default=None),
    free_text: Optional[str] = Form(default=None),
    db: Session = Depends(get_db),
    _: str = Depends(get_current_admin),
):
    """
    Admin-only certificate creation.

    - background_image: required
    - product_image: optional
    - certificate_data: JSON string, all fields optional
    - free_text: optional
    """
    # Persist background image
    bg_dir = settings.UPLOAD_DIR / settings.BACKGROUND_SUBDIR
    bg_dir.mkdir(parents=True, exist_ok=True)

    bg_ext = (
        Path(background_image.filename).suffix.lstrip(".")
        if background_image.filename
        else "png"
    )
    bg_filename = f"bg_{uuid.uuid4().hex[:12]}.{bg_ext}"
    bg_path = bg_dir / bg_filename
    with bg_path.open("wb") as f:
        f.write(await background_image.read())

    product_image_path: Optional[Path] = None
    product_rel_path: Optional[str] = None
    if product_image is not None:
        prod_dir = settings.UPLOAD_DIR / settings.PRODUCT_SUBDIR
        prod_dir.mkdir(parents=True, exist_ok=True)
        prod_ext = (
            Path(product_image.filename).suffix.lstrip(".")
            if product_image.filename
            else "png"
        )
        prod_filename = f"cert_product_{uuid.uuid4().hex[:12]}.{prod_ext}"
        product_image_path = prod_dir / prod_filename
        with product_image_path.open("wb") as f:
            f.write(await product_image.read())
        product_rel_path = str(
            PurePosixPath("static") / "uploads" / settings.PRODUCT_SUBDIR / prod_filename
        )

    parsed_data: Optional[Dict[str, Any]] = None
    if certificate_data:
        try:
            parsed = json.loads(certificate_data)
            if isinstance(parsed, dict):
                parsed_data = parsed
        except json.JSONDecodeError:
            raise HTTPException(status_code=400, detail="certificate_data must be valid JSON object")

    certificate_code = uuid.uuid4().hex[:10].upper()

    certificate_code, generated_rel_path = generate_certificate_image(
        background_path=bg_path,
        product_image_path=product_image_path,
        certificate_data=parsed_data,
        free_text=free_text,
        certificate_code=certificate_code,
    )

    certificate = Certificate(
        certificate_code=certificate_code,
        certificate_data=parsed_data,
        free_text=free_text,
        background_image_path=str(
            PurePosixPath("static") / "uploads" / settings.BACKGROUND_SUBDIR / bg_filename
        ),
        product_image_path=product_rel_path,
        generated_image_path=generated_rel_path,
    )

    db.add(certificate)
    db.commit()
    db.refresh(certificate)
    return certificate


@router.get("/verify/{certificate_code}", response_model=CertificateRead)
def verify_certificate(certificate_code: str, db: Session = Depends(get_db)):
    certificate = (
        db.query(Certificate)
        .filter(Certificate.certificate_code == certificate_code)
        .first()
    )
    if not certificate:
        raise HTTPException(status_code=404, detail="Certificate not found")
    return certificate


@router.get("/admin", response_model=CertificateListResponse)
def admin_list_certificates(
    search: Optional[str] = None,
    page: int = 1,
    limit: int = 20,
    db: Session = Depends(get_db),
    _: str = Depends(get_current_admin),
):
    if page < 1:
        raise HTTPException(status_code=400, detail="page must be >= 1")
    if limit < 1 or limit > 100:
        raise HTTPException(status_code=400, detail="limit must be between 1 and 100")

    query = db.query(Certificate)
    if search:
        s = f"%{search.strip()}%"
        query = query.filter(
            or_(
                Certificate.certificate_code.ilike(s),
            )
        )

    total = query.count()
    items = (
        query.order_by(Certificate.created_at.desc(), Certificate.id.desc())
        .offset((page - 1) * limit)
        .limit(limit)
        .all()
    )
    return CertificateListResponse(items=items, page=page, limit=limit, total=total)


@router.get("/admin/{certificate_id}", response_model=CertificateRead)
def admin_get_certificate(
    certificate_id: int,
    db: Session = Depends(get_db),
    _: str = Depends(get_current_admin),
):
    certificate = db.query(Certificate).filter(Certificate.id == certificate_id).first()
    if not certificate:
        raise HTTPException(status_code=404, detail="Certificate not found")
    return certificate


@router.delete("/admin/{certificate_id}", status_code=status.HTTP_204_NO_CONTENT)
def admin_delete_certificate(
    certificate_id: int,
    db: Session = Depends(get_db),
    _: str = Depends(get_current_admin),
):
    certificate = db.query(Certificate).filter(Certificate.id == certificate_id).first()
    if not certificate:
        raise HTTPException(status_code=404, detail="Certificate not found")

    bg_path = certificate.background_image_path
    prod_path = certificate.product_image_path
    gen_path = certificate.generated_image_path

    db.delete(certificate)
    db.commit()

    _delete_static_file(bg_path)
    _delete_static_file(prod_path)
    _delete_static_file(gen_path)

    return None

