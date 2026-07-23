from __future__ import annotations

import re
from datetime import datetime
from typing import Optional, List

from pydantic import BaseModel, field_validator


def _validate_slug(v: str) -> str:
    if v and not re.match(r'^[a-z0-9-]+$', v):
        raise ValueError("Slug must contain only lowercase letters, digits, and hyphens")
    return v


class CategoryMinimal(BaseModel):
    id: int
    name: str
    slug: str

    class Config:
        from_attributes = True


class ProductBase(BaseModel):
    name: str
    slug: str
    description: Optional[str] = None
    benefits: Optional[str] = None
    price: Optional[float] = None
    mrp: Optional[float] = None
    badge: Optional[str] = None
    category_id: Optional[int] = None
    # -1 = unlimited/not tracked, 0+ = real inventory
    stock: int = -1

    @field_validator("slug")
    @classmethod
    def slug_format(cls, v: str) -> str:
        return _validate_slug(v)


class ProductCreate(ProductBase):
    pass


class ProductUpdate(BaseModel):
    name: Optional[str] = None
    slug: Optional[str] = None
    description: Optional[str] = None
    benefits: Optional[str] = None
    price: Optional[float] = None
    mrp: Optional[float] = None
    badge: Optional[str] = None
    category_id: Optional[int] = None
    image_path: Optional[str] = None
    video_path: Optional[str] = None
    stock: Optional[int] = None
    is_active: Optional[bool] = None
    sort_order: Optional[int] = None

    @field_validator("slug")
    @classmethod
    def slug_format(cls, v: Optional[str]) -> Optional[str]:
        if v is None:
            return v
        return _validate_slug(v)


class ProductImageRead(BaseModel):
    id: int
    image_path: str
    sort_order: int

    class Config:
        from_attributes = True


class ProductImageReorderRequest(BaseModel):
    image_ids: List[int]


class ProductRead(BaseModel):
    id: int
    name: str
    slug: str
    description: Optional[str] = None
    benefits: Optional[str] = None
    price: Optional[float] = None
    mrp: Optional[float] = None
    badge: Optional[str] = None
    category_id: Optional[int] = None
    category: Optional[CategoryMinimal] = None
    stock: int = -1
    is_active: bool = True
    sort_order: int = 0
    image_path: Optional[str] = None
    video_path: Optional[str] = None
    images: List[ProductImageRead] = []
    rating_avg: Optional[float] = None
    rating_count: int = 0
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True

    @field_validator('is_active', mode='before')
    @classmethod
    def _coerce_is_active(cls, v):
        return True if v is None else v

    @field_validator('sort_order', mode='before')
    @classmethod
    def _coerce_sort_order(cls, v):
        return 0 if v is None else v

    @field_validator('rating_count', mode='before')
    @classmethod
    def _coerce_rating_count(cls, v):
        return 0 if v is None else v

    @field_validator('stock', mode='before')
    @classmethod
    def _coerce_stock(cls, v):
        return -1 if v is None else v


class ProductListResponse(BaseModel):
    items: List[ProductRead]
    page: int
    limit: int
    total: int


class GenerateSlugRequest(BaseModel):
    name: str


class GenerateSlugResponse(BaseModel):
    slug: str
