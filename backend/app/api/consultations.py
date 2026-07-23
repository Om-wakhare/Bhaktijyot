from __future__ import annotations

from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.security import get_current_admin
from app.db.session import get_db
from app.models.consultation import Consultation
from app.schemas.consultation import (
    ConsultationCreate,
    ConsultationListResponse,
    ConsultationRead,
    ConsultationStatusUpdate,
)

router = APIRouter(prefix="/consultations", tags=["consultations"])

VALID_STATUSES = {"new", "contacted", "booked", "completed", "cancelled"}


@router.post("", response_model=ConsultationRead, status_code=status.HTTP_201_CREATED)
def create_consultation(payload: ConsultationCreate, db: Session = Depends(get_db)):
    """Public endpoint — saves a consultation booking request."""
    consultation = Consultation(
        name=payload.name,
        phone=payload.phone,
        consultation_type=payload.consultation_type,
        concern=payload.concern,
        preferred_date=payload.preferred_date,
        preferred_time=payload.preferred_time,
        status="new",
    )
    db.add(consultation)
    db.commit()
    db.refresh(consultation)
    return consultation


# ── Admin endpoints ───────────────────────────────────────────────

@router.get("", response_model=ConsultationListResponse)
def list_consultations(
    page: int = 1,
    limit: int = 25,
    status_filter: Optional[str] = None,
    db: Session = Depends(get_db),
    _: str = Depends(get_current_admin),
):
    q = db.query(Consultation)
    if status_filter:
        q = q.filter(Consultation.status == status_filter)
    total = q.count()
    items = q.order_by(Consultation.created_at.desc()).offset((page - 1) * limit).limit(limit).all()
    return {"items": items, "total": total}


@router.get("/{consultation_id}", response_model=ConsultationRead)
def get_consultation(
    consultation_id: int,
    db: Session = Depends(get_db),
    _: str = Depends(get_current_admin),
):
    c = db.query(Consultation).filter(Consultation.id == consultation_id).first()
    if not c:
        raise HTTPException(status_code=404, detail="Consultation not found")
    return c


@router.put("/{consultation_id}/status", response_model=ConsultationRead)
def update_status(
    consultation_id: int,
    payload: ConsultationStatusUpdate,
    db: Session = Depends(get_db),
    _: str = Depends(get_current_admin),
):
    if payload.status not in VALID_STATUSES:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid status. Must be one of: {VALID_STATUSES}",
        )
    c = db.query(Consultation).filter(Consultation.id == consultation_id).first()
    if not c:
        raise HTTPException(status_code=404, detail="Consultation not found")
    c.status = payload.status
    if payload.admin_notes is not None:
        c.admin_notes = payload.admin_notes
    db.commit()
    db.refresh(c)
    return c
