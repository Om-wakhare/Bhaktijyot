from __future__ import annotations

from datetime import datetime
from typing import Optional

from sqlalchemy import DateTime, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.db.session import Base


class Consultation(Base):
    __tablename__ = "consultations"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    phone: Mapped[str] = mapped_column(String(30), nullable=False)
    consultation_type: Mapped[str] = mapped_column(String(100), nullable=False)
    concern: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    preferred_date: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)
    preferred_time: Mapped[Optional[str]] = mapped_column(String(60), nullable=True)

    # Workflow status — managed by admin
    status: Mapped[str] = mapped_column(String(30), default="new", nullable=False)
    # Admin-only notes field
    admin_notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=datetime.utcnow
    )
