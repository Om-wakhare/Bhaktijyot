from __future__ import annotations

from datetime import datetime
from typing import Optional, Dict, Any

from sqlalchemy import DateTime, Integer, JSON, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.db.session import Base


class Certificate(Base):
    __tablename__ = "certificates"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    certificate_code: Mapped[str] = mapped_column(String(64), unique=True, index=True)

    certificate_data: Mapped[Optional[Dict[str, Any]]] = mapped_column(JSON, nullable=True)
    free_text: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    background_image_path: Mapped[str] = mapped_column(String(500), nullable=False)
    product_image_path: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    generated_image_path: Mapped[str] = mapped_column(String(500), nullable=False)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=datetime.utcnow
    )

