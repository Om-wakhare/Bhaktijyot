from __future__ import annotations

from sqlalchemy import Boolean, Integer, String
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
