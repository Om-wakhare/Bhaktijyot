from __future__ import annotations

from datetime import datetime
from typing import Optional

from pydantic import BaseModel, field_validator


class ConsultationCreate(BaseModel):
    name: str
    phone: str
    consultation_type: str
    concern: Optional[str] = None
    preferred_date: Optional[str] = None
    preferred_time: Optional[str] = None

    @field_validator("name")
    @classmethod
    def name_not_empty(cls, v: str) -> str:
        v = v.strip()
        if not v:
            raise ValueError("Name is required")
        return v

    @field_validator("phone")
    @classmethod
    def phone_not_empty(cls, v: str) -> str:
        v = v.strip()
        if not v:
            raise ValueError("Phone is required")
        return v


class ConsultationStatusUpdate(BaseModel):
    status: str
    admin_notes: Optional[str] = None


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
