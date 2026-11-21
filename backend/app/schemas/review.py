from __future__ import annotations

from datetime import datetime
from typing import Optional

from pydantic import BaseModel, Field, field_validator


class ReviewCreate(BaseModel):
    reviewer_name: str = Field(min_length=1, max_length=255)
    reviewer_phone: Optional[str] = Field(default=None, max_length=30)
    reviewer_email: Optional[str] = Field(default=None, max_length=255)
    rating: int = Field(ge=1, le=5)
    title: Optional[str] = Field(default=None, max_length=255)
    comment: str = Field(min_length=1, max_length=3000)

    @field_validator("reviewer_name", "comment")
    @classmethod
    def _strip_required(cls, v: str) -> str:
        v = v.strip()
        if not v:
            raise ValueError("This field is required")
        return v

    @field_validator("reviewer_phone", "reviewer_email", "title")
    @classmethod
    def _strip_optional(cls, v: Optional[str]) -> Optional[str]:
        if v is None:
            return None
        v = v.strip()
        return v or None


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
    product_name: Optional[str] = None
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


class ReviewPublicRead(BaseModel):
    """Public view of a review — never exposes the reviewer's phone or email."""
    id: int
    product_id: int
    reviewer_name: str
    rating: int
    title: Optional[str] = None
    comment: str
    is_verified_offline: bool
    created_at: datetime

    class Config:
        from_attributes = True


class ReviewPublicListResponse(BaseModel):
    items: list[ReviewPublicRead]
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
