from __future__ import annotations

from datetime import datetime
from typing import Optional, List

from pydantic import BaseModel, Field, field_validator

from app.core.validators import validate_slug as _validate_slug


class CategoryMinimal(BaseModel):
    id: int
    name: str
    slug: str

    class Config:
        from_attributes = True


def _blank_to_none(v):
    if isinstance(v, str) and not v.strip():
        return None
    return v


class ProductBase(BaseModel):
    name: str = Field(min_length=1, max_length=255)
    slug: str
    description: Optional[str] = None
    benefits: Optional[str] = None
    price: Optional[float] = Field(default=None, ge=0, le=10_000_000)
    mrp: Optional[float] = Field(default=None, ge=0, le=10_000_000)
    badge: Optional[str] = Field(default=None, max_length=100)
    category_id: Optional[int] = None
    # -1 = unlimited/not tracked, 0+ = real inventory
    stock: int = Field(default=-1, ge=-1)
    is_active: bool = True
    sort_order: int = 0

    @field_validator("slug")
    @classmethod
    def slug_format(cls, v: str) -> str:
        return _validate_slug(v)

    @field_validator("name")
    @classmethod
    def _strip_name(cls, v: str) -> str:
        v = v.strip()
        if not v:
            raise ValueError("Name is required")
        return v

    @field_validator("price", "mrp", "category_id", "badge", mode="before")
    @classmethod
    def _blank(cls, v):
        return _blank_to_none(v)


class ProductCreate(ProductBase):
    pass


class ProductUpdate(BaseModel):
    name: Optional[str] = Field(default=None, min_length=1, max_length=255)
    slug: Optional[str] = None
    description: Optional[str] = None
    benefits: Optional[str] = None
    price: Optional[float] = Field(default=None, ge=0, le=10_000_000)
    mrp: Optional[float] = Field(default=None, ge=0, le=10_000_000)
    badge: Optional[str] = Field(default=None, max_length=100)
    category_id: Optional[int] = None
    stock: Optional[int] = Field(default=None, ge=-1)
    is_active: Optional[bool] = None
    sort_order: Optional[int] = None
    # NOTE: image_path / video_path are managed only through the media endpoints

    @field_validator("price", "mrp", "category_id", "badge", mode="before")
    @classmethod
    def _blank(cls, v):
        return _blank_to_none(v)

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


class BulkRowError(BaseModel):
    row: int
    error: str


class BulkUploadResult(BaseModel):
    created: int
    skipped: int
    created_products: List[str] = []
    errors: List[BulkRowError] = []
