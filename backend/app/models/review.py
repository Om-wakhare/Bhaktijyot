from __future__ import annotations

from datetime import datetime
from typing import Optional

from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.session import Base


class Review(Base):
    __tablename__ = "reviews"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    product_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("products.id", ondelete="CASCADE"),
        index=True,
        nullable=False,
    )

    reviewer_name: Mapped[str] = mapped_column(String(255), nullable=False)
    reviewer_phone: Mapped[Optional[str]] = mapped_column(String(30), nullable=True)
    reviewer_email: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)

    rating: Mapped[int] = mapped_column(Integer, nullable=False)
    title: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    comment: Mapped[str] = mapped_column(Text, nullable=False)

    is_approved: Mapped[bool] = mapped_column(Boolean, default=False)
    is_verified_offline: Mapped[bool] = mapped_column(Boolean, default=False)

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow)

    product = relationship("Product")
