from __future__ import annotations

from datetime import datetime
from typing import Any, Dict, Optional

from pydantic import BaseModel


class CertificateRead(BaseModel):
    id: int
    certificate_code: str
    certificate_data: Optional[Dict[str, Any]] = None
    free_text: Optional[str] = None
    background_image_path: str
    product_image_path: Optional[str] = None
    generated_image_path: str
    created_at: datetime

    class Config:
        from_attributes = True


class CertificateListResponse(BaseModel):
    items: list[CertificateRead]
    page: int
    limit: int
    total: int

