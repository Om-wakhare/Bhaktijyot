from __future__ import annotations

from typing import List, Optional

from pydantic import BaseModel


class CategoryBase(BaseModel):
    name: str
    slug: str
    description: Optional[str] = None
    parent_id: Optional[int] = None


class CategoryCreate(CategoryBase):
    pass


class CategoryUpdate(BaseModel):
    name: Optional[str] = None
    slug: Optional[str] = None
    description: Optional[str] = None
    parent_id: Optional[int] = None


class CategoryRead(CategoryBase):
    id: int
    children: List["CategoryRead"] = []

    class Config:
        from_attributes = True


CategoryRead.model_rebuild()


class CategoryFlatRead(BaseModel):
    id: int
    name: str
    slug: str
    description: Optional[str] = None
    parent_id: Optional[int] = None

    class Config:
        from_attributes = True

