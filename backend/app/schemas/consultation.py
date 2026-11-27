from __future__ import annotations

from datetime import datetime
from typing import Optional

from pydantic import BaseModel, Field, field_validator

from app.core.validators import normalize_indian_mobile, strip_required


class ConsultationCreate(BaseModel):
    name: str = Field(max_length=200)
    phone: str
    consultation_type: str = Field(max_length=100)
    concern: Optional[str] = Field(default=None, max_length=2000)
    preferred_date: Optional[str] = Field(default=None, max_length=20)
    preferred_time: Optional[str] = Field(default=None, max_length=60)

    @field_validator("name")
    @classmethod
    def name_not_empty(cls, v: str) -> str:
        return strip_required(v, "Name", 200)

    @field_validator("phone")
    @classmethod
    def phone_valid(cls, v: str) -> str:
        return normalize_indian_mobile(v)

    @field_validator("consultation_type")
    @classmethod
    def type_not_empty(cls, v: str) -> str:
        return strip_required(v, "Consultation type", 100)

    @field_validator("concern", "preferred_date", "preferred_time")
    @classmethod
    def _strip_optional(cls, v: Optional[str]) -> Optional[str]:
        if v is None:
            return None
        v = v.strip()
        return v or None


class ConsultationStatusUpdate(BaseModel):
    status: str
    admin_notes: Optional[str] = Field(default=None, max_length=5000)


class ConsultationRead(BaseModel):
    id: int
    name: str
    phone: str
    consultation_type: str
    concern: Optional[str]
    preferred_date: Optional[str]
    preferred_time: Optional[str]
    status: str
    admin_notes: Optional[str]
    created_at: datetime

    model_config = {"from_attributes": True}


class ConsultationListResponse(BaseModel):
    items: list[ConsultationRead]
    total: int
