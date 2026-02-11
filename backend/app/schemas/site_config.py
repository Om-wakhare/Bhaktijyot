from __future__ import annotations

from typing import Optional

from pydantic import BaseModel, Field


class SiteConfigRead(BaseModel):
    announcement_enabled: bool
    announcement_message: str
    announcement_cta_text: str
    announcement_cta_link: str

    class Config:
        from_attributes = True


class SiteConfigUpdate(BaseModel):
    announcement_enabled: Optional[bool] = None
    announcement_message: Optional[str] = Field(default=None, max_length=300)
    announcement_cta_text: Optional[str] = Field(default=None, max_length=50)
    announcement_cta_link: Optional[str] = Field(default=None, max_length=200)
