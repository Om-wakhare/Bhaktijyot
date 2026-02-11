from __future__ import annotations

from datetime import datetime
from typing import Optional

from pydantic import BaseModel, Field


class ReviewCreate(BaseModel):
    reviewer_name: str = Field(min_length=1, max_length=255)
    reviewer_phone: Optional[str] = Field(default=None, max_length=30)
    reviewer_email: Optional[str] = Field(default=None, max_length=255)
    rating: int = Field(ge=1, le=5)
    title: Optional[str] = Field(default=None, max_length=255)
    comment: str = Field(min_length=1)


class ReviewUpdateByAdmin(BaseModel):
    reviewer_name: Optional[str] = Field(default=None, min_length=1, max_length=255)
    reviewer_phone: Optional[str] = Field(default=None, max_length=30)
    reviewer_email: Optional[str] = Field(default=None, max_length=255)
    rating: Optional[int] = Field(default=None, ge=1, le=5)
    title: Optional[str] = Field(default=None, max_length=255)
    comment: Optional[str] = Field(default=None, min_length=1)
    is_approved: Optional[bool] = None
    is_verified_offline: Optional[bool] = None


class ReviewRead(BaseModel):
    id: int
    product_id: int
    reviewer_name: str
    reviewer_phone: Optional[str] = None
    reviewer_email: Optional[str] = None
    rating: int
    title: Optional[str] = None
    comment: str
    is_approved: bool
    is_verified_offline: bool
    created_at: datetime

    class Config:
        from_attributes = True


class ReviewListResponse(BaseModel):
    items: list[ReviewRead]
    page: int
    limit: int
    total: int


class ReviewFeedItem(BaseModel):
    id: int
    product_id: int
    product_name: str
    product_image_path: Optional[str] = None
    rating: int
    title: Optional[str] = None
    comment: str
    reviewer_name: str
    is_verified_offline: bool
    created_at: datetime


class ReviewFeedResponse(BaseModel):
    items: list[ReviewFeedItem]
