from __future__ import annotations

from typing import Optional, List

from pydantic import BaseModel


class ProductBase(BaseModel):
    name: str
    slug: str
    description: Optional[str] = None
    benefits: Optional[str] = None
    price: Optional[float] = None
    mrp: Optional[float] = None
    category_id: Optional[int] = None


class ProductCreate(ProductBase):
    pass


class ProductUpdate(BaseModel):
    name: Optional[str] = None
    slug: Optional[str] = None
    description: Optional[str] = None
    benefits: Optional[str] = None
    price: Optional[float] = None
    mrp: Optional[float] = None
    category_id: Optional[int] = None
    image_path: Optional[str] = None
    video_path: Optional[str] = None


class ProductImageRead(BaseModel):
    id: int
    image_path: str
    sort_order: int

    class Config:
        from_attributes = True


class ProductImageReorderRequest(BaseModel):
    image_ids: List[int]


class ProductRead(ProductBase):
    id: int
    image_path: Optional[str] = None
    video_path: Optional[str] = None
    images: List[ProductImageRead] = []
    rating_avg: Optional[float] = None
    rating_count: int = 0

    class Config:
        from_attributes = True


class ProductListResponse(BaseModel):
    items: List[ProductRead]
    page: int
    limit: int
    total: int

