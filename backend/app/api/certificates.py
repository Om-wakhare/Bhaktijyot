import io
import json
import re
import uuid
from pathlib import Path
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile, status
from fastapi.concurrency import run_in_threadpool
from PIL import Image, UnidentifiedImageError
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.security import get_current_admin
from app.db.session import get_db
from app.models.certificate import Certificate
from app.schemas.certificate import CertificateListResponse, CertificateRead
from app.services.certificate_renderer import generate_certificate_image
from app.services.storage import delete_public_file, is_inside, public_path, public_to_disk

router = APIRouter(prefix="/certificates", tags=["certificates"])

_IMAGE_EXTS = {".png", ".jpg", ".jpeg", ".webp"}
MAX_TEMPLATE_BYTES = 15 * 1024 * 1024
MAX_PHOTO_BYTES = 8 * 1024 * 1024
_SAFE_NAME = re.compile(r"^[A-Za-z0-9][A-Za-z0-9 _-]{0,79}$")


# ── Helpers ────────────────────────────────────────────────────────────────────

def _safe_template_name(name: str) -> str:
    """Template names become file names: letters, digits, spaces, '-' and '_' only."""
    cleaned = re.sub(r"[^A-Za-z0-9 _-]+", "-", (name or "").strip()).strip(" -_")[:80]
    if not cleaned or not _SAFE_NAME.match(cleaned):
        raise HTTPException(400, "Template name must use letters, numbers, spaces, hyphens or underscores.")
    return cleaned


def _check_image_bytes(content: bytes, max_bytes: int, what: str) -> None:
    if len(content) > max_bytes:
        raise HTTPException(400, f"{what} is too large (max {max_bytes // (1024 * 1024)} MB).")
    try:
        Image.open(io.BytesIO(content)).verify()
    except (UnidentifiedImageError, OSError, Image.DecompressionBombError):
        raise HTTPException(400, f"{what} is not a readable image.")


def _find_template(name: str) -> Optional[Path]:
    """Return the Path for a stored template by stem name, or None."""
    if not name or not _SAFE_NAME.match(name):
        return None
    d = settings.CERT_TEMPLATES_DIR
    for ext in _IMAGE_EXTS:
        candidate = d / f"{name}{ext}"
        if candidate.exists():
            return candidate
    return None


# ── Template management ────────────────────────────────────────────────────────

@router.get("/templates", response_model=List[dict])
def list_templates(_: str = Depends(get_current_admin)):
    """Return all stored certificate templates."""
    d = settings.CERT_TEMPLATES_DIR
    if not d.exists():
        return []
    return [
        {
            "name": f.stem,
            "filename": f.name,
            "url": f"static/uploads/cert_templates/{f.name}",
        }
        for f in sorted(d.iterdir())
        if f.is_file() and f.suffix.lower() in _IMAGE_EXTS
    ]


@router.post("/templates", status_code=status.HTTP_201_CREATED)
async def upload_template(
    file: UploadFile = File(...),
    _: str = Depends(get_current_admin),
):
    """Upload (or replace) a certificate template image."""
    if not file.filename:
        raise HTTPException(400, "Filename is required")
    ext = Path(file.filename).suffix.lower()
    if ext not in _IMAGE_EXTS:
        raise HTTPException(400, "Only png / jpg / jpeg / webp files are accepted")

    stem = _safe_template_name(Path(file.filename).stem)
    content = await file.read(MAX_TEMPLATE_BYTES + 1)
    _check_image_bytes(content, MAX_TEMPLATE_BYTES, "Template")
    d = settings.CERT_TEMPLATES_DIR
    d.mkdir(parents=True, exist_ok=True)

    # Remove any existing template with the same stem (different extension)
    for old_ext in _IMAGE_EXTS:
        old = d / f"{stem}{old_ext}"
        if old.exists():
            old.unlink()

    dest = d / f"{stem}{ext}"
    dest.write_bytes(content)

    return {"name": stem, "filename": dest.name, "url": f"static/uploads/cert_templates/{dest.name}"}


@router.delete("/templates/{template_name}", status_code=status.HTTP_204_NO_CONTENT)
def delete_template(template_name: str, _: str = Depends(get_current_admin)):
    """Delete a stored template by name (without extension)."""
    path = _find_template(template_name)
    if path is None:
        raise HTTPException(404, "Template not found")
    path.unlink()
    return None


# ── Certificate generation ─────────────────────────────────────────────────────

@router.post("", response_model=CertificateRead, status_code=status.HTTP_201_CREATED)
async def create_certificate(
    template_name: Optional[str] = Form(default=None),
    product_image: Optional[UploadFile] = File(default=None),
    certificate_data: Optional[str] = Form(default=None),
    free_text: Optional[str] = Form(default=None),
    db: Session = Depends(get_db),
    _: str = Depends(get_current_admin),
):
    """
    Generate a certificate using a stored template selected by name.

    - template_name: stem name of a stored template (required)
    - product_image: gemstone photo (optional)
    - certificate_data: JSON object with gemstone fields
    - free_text: extra lines appended after structured fields
    """
    # Resolve template
    if not template_name:
        raise HTTPException(400, "template_name is required — upload a template first")
    bg_path = _find_template(template_name)
    if bg_path is None:
        raise HTTPException(404, f"Template '{template_name}' not found")
    bg_rel_path = f"static/uploads/cert_templates/{bg_path.name}"

    # Save optional gemstone photo
    product_image_path: Optional[Path] = None
    product_rel_path: Optional[str] = None
    if product_image is not None and product_image.filename:
        prod_ext = Path(product_image.filename).suffix.lower()
        if prod_ext not in _IMAGE_EXTS:
            raise HTTPException(400, "Gemstone photo must be a PNG, JPG or WebP image.")
        content = await product_image.read(MAX_PHOTO_BYTES + 1)
        _check_image_bytes(content, MAX_PHOTO_BYTES, "Gemstone photo")
        prod_dir = settings.UPLOAD_DIR / settings.PRODUCT_SUBDIR
        prod_dir.mkdir(parents=True, exist_ok=True)
        prod_filename = f"cert_product_{uuid.uuid4().hex[:12]}{prod_ext}"
        product_image_path = prod_dir / prod_filename
        product_image_path.write_bytes(content)
        product_rel_path = public_path("uploads", settings.PRODUCT_SUBDIR, prod_filename)

    # Parse structured fields
    parsed_data: Optional[Dict[str, Any]] = None
    if certificate_data:
        try:
            parsed = json.loads(certificate_data)
            if isinstance(parsed, dict):
                parsed_data = parsed
        except json.JSONDecodeError:
            raise HTTPException(400, "certificate_data must be a valid JSON object")
    # A QR image may only come from our own uploads folder, never an arbitrary server path.
    # The renderer gets the disk path; what we store (and show publicly) keeps the public path.
    render_data = dict(parsed_data) if parsed_data else None
    if parsed_data and parsed_data.get("qr_image_path"):
        qr = public_to_disk(str(parsed_data["qr_image_path"]))
        if qr is None or not is_inside(qr, settings.UPLOAD_DIR) or not qr.is_file():
            parsed_data.pop("qr_image_path", None)
            render_data.pop("qr_image_path", None)
        else:
            render_data["qr_image_path"] = str(qr)

    certificate_code = uuid.uuid4().hex[:10].upper()

    # Pillow renders a 300-DPI A4 image + PDF: run it off the event loop
    certificate_code, generated_rel_path = await run_in_threadpool(
        generate_certificate_image,
        background_path=bg_path,
        product_image_path=product_image_path,
        certificate_data=render_data,
        free_text=free_text,
        certificate_code=certificate_code,
    )

    certificate = Certificate(
        certificate_code=certificate_code,
        certificate_data=parsed_data,
        free_text=free_text,
        background_image_path=bg_rel_path,
        product_image_path=product_rel_path,
        generated_image_path=generated_rel_path,
    )
    db.add(certificate)
    db.commit()
    db.refresh(certificate)
    return certificate


# ── Public verification ────────────────────────────────────────────────────────

@router.get("/verify/{certificate_code}", response_model=CertificateRead)
def verify_certificate(certificate_code: str, db: Session = Depends(get_db)):
    # Codes are issued in upper case; accept whatever case customers type
    code = certificate_code.strip().upper()
    cert = db.query(Certificate).filter(Certificate.certificate_code == code).first()
    if not cert:
        raise HTTPException(404, "Certificate not found")
    return cert


# ── Admin list / detail / delete ───────────────────────────────────────────────

@router.get("/admin", response_model=CertificateListResponse)
def admin_list_certificates(
    search: Optional[str] = None,
    page: int = 1,
    limit: int = 20,
    db: Session = Depends(get_db),
    _: str = Depends(get_current_admin),
):
    if page < 1:
        raise HTTPException(400, "page must be >= 1")
    if limit < 1 or limit > 100:
        raise HTTPException(400, "limit must be between 1 and 100")

    query = db.query(Certificate)
    if search and search.strip():
        query = query.filter(Certificate.certificate_code.ilike(f"%{search.strip()}%"))

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
    cert = db.query(Certificate).filter(Certificate.id == certificate_id).first()
    if not cert:
        raise HTTPException(404, "Certificate not found")
    return cert


@router.delete("/admin/{certificate_id}", status_code=status.HTTP_204_NO_CONTENT)
def admin_delete_certificate(
    certificate_id: int,
    db: Session = Depends(get_db),
    _: str = Depends(get_current_admin),
):
    cert = db.query(Certificate).filter(Certificate.id == certificate_id).first()
    if not cert:
        raise HTTPException(404, "Certificate not found")

    bg_path = cert.background_image_path
    prod_path = cert.product_image_path
    gen_path = cert.generated_image_path

    db.delete(cert)
    db.commit()

    delete_public_file(prod_path)
    delete_public_file(gen_path)
    if gen_path and gen_path.endswith(".png"):
        delete_public_file(gen_path[:-4] + ".pdf")  # the renderer writes a PDF beside the PNG
    # Do NOT delete the template (bg_path) — it's shared across certificates

    return None
