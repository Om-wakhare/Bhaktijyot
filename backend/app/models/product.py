from __future__ import annotations

from datetime import datetime
from typing import Optional, List

from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, Numeric, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.session import Base


class Product(Base):
    __tablename__ = "products"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    slug: Mapped[str] = mapped_column(String(255), unique=True, index=True)

    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    benefits: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    price: Mapped[Optional[float]] = mapped_column(Numeric(10, 2), nullable=True)
    mrp: Mapped[Optional[float]] = mapped_column(Numeric(10, 2), nullable=True)

    rating_avg: Mapped[Optional[float]] = mapped_column(Numeric(3, 2), nullable=True)
    rating_count: Mapped[int] = mapped_column(Integer, default=0)

    # stock: -1 = unlimited/not tracked, 0+ = real inventory count
    stock: Mapped[int] = mapped_column(Integer, default=-1)

    badge: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)

    # Published/draft toggle — False hides product from public catalog
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

    # Manual sort order for curated product ordering (lower = appears first)
    sort_order: Mapped[int] = mapped_column(Integer, default=0, nullable=False)

    image_path: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    video_path: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)

    images: Mapped[List["ProductImage"]] = relationship(
        "ProductImage",
        back_populates="product",
        cascade="all, delete-orphan",
        order_by="ProductImage.sort_order",
    )

    category_id: Mapped[Optional[int]] = mapped_column(
        Integer, ForeignKey("categories.id"), nullable=True
    )
    category = relationship("Category")

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=datetime.utcnow
    )
    updated_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), onupdate=func.now(), nullable=True
    )

