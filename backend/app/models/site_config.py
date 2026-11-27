from __future__ import annotations

from datetime import datetime
from typing import Optional

from sqlalchemy import Boolean, DateTime, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.db.session import Base


class SiteConfig(Base):
    __tablename__ = "site_config"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, default=1)

    announcement_enabled: Mapped[bool] = mapped_column(Boolean, default=True)
    announcement_message: Mapped[str] = mapped_column(
        String(300), default="Authentic gemstone reports & spiritual products"
    )
    announcement_cta_text: Mapped[str] = mapped_column(String(50), default="Shop Now")
    announcement_cta_link: Mapped[str] = mapped_column(String(200), default="/products")

    # WhatsApp contact number (with country code, no +/spaces)
    whatsapp_number: Mapped[str] = mapped_column(String(30), default="918484913170")

    # Instagram long-lived token saved by the admin "Refresh" button. Server-side only:
    # never part of SiteConfigRead. Falls back to the INSTAGRAM_ACCESS_TOKEN env var.
    instagram_token: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    instagram_token_expires_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
