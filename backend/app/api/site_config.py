from __future__ import annotations

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.security import get_current_admin
from app.db.session import get_db
from app.models.site_config import SiteConfig
from app.schemas.site_config import SiteConfigRead, SiteConfigUpdate

router = APIRouter(prefix="/site-config", tags=["site-config"])


def _get_or_create(db: Session) -> SiteConfig:
    cfg = db.query(SiteConfig).filter(SiteConfig.id == 1).first()
    if cfg:
        return cfg
    cfg = SiteConfig(id=1)
    db.add(cfg)
    db.commit()
    db.refresh(cfg)
    return cfg


@router.get("", response_model=SiteConfigRead)
def get_site_config(db: Session = Depends(get_db)):
    return _get_or_create(db)


@router.put("", response_model=SiteConfigRead)
def update_site_config(
    payload: SiteConfigUpdate,
    db: Session = Depends(get_db),
    _: str = Depends(get_current_admin),
):
    cfg = _get_or_create(db)
    updates = payload.model_dump(exclude_unset=True)
    for field, value in updates.items():
        setattr(cfg, field, value)
    db.commit()
    db.refresh(cfg)
    return cfg
