from __future__ import annotations

from typing import List, Literal, Optional

from pydantic import BaseModel, Field, field_validator

from app.core.validators import validate_slug

World = Literal["pooja", "crystals", "gemstones"]


def _blank_to_none(v):
    if isinstance(v, str) and not v.strip():
        return None
    return v


class CategoryCreate(BaseModel):
    name: str = Field(min_length=1, max_length=255)
    slug: str
    description: Optional[str] = Field(default=None, max_length=1000)
    parent_id: Optional[int] = None
    world: Optional[World] = None

    @field_validator("name")
    @classmethod
    def _strip_name(cls, v: str) -> str:
        v = v.strip()
        if not v:
            raise ValueError("Name is required")
        return v

    @field_validator("slug")
    @classmethod
    def _slug(cls, v: str) -> str:
        return validate_slug(v)

    @field_validator("world", "parent_id", "description", mode="before")
    @classmethod
    def _blank(cls, v):
        return _blank_to_none(v)


class CategoryUpdate(BaseModel):
    name: Optional[str] = Field(default=None, min_length=1, max_length=255)
    slug: Optional[str] = None
    description: Optional[str] = Field(default=None, max_length=1000)
    parent_id: Optional[int] = None
    world: Optional[World] = None

    @field_validator("slug")
    @classmethod
    def _slug(cls, v: Optional[str]) -> Optional[str]:
        return None if v is None else validate_slug(v)

    @field_validator("world", "parent_id", "description", mode="before")
    @classmethod
    def _blank(cls, v):
        return _blank_to_none(v)


# Read models carry no validators: legacy rows must always serialise.
class CategoryRead(BaseModel):
    id: int
    name: str
    slug: str
    description: Optional[str] = None
    parent_id: Optional[int] = None
    world: Optional[str] = None
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
    # Effective world (inherited from the nearest ancestor when not set directly)
    world: Optional[str] = None

    class Config:
        from_attributes = True
