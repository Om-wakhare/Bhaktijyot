from __future__ import annotations

from datetime import datetime
from typing import List, Optional

from pydantic import BaseModel, Field, field_validator

from app.core.validators import (
    normalize_indian_mobile,
    strip_required,
    validate_email_optional,
    validate_pincode,
)

MAX_QTY_PER_ITEM = 99
MAX_LINES_PER_ORDER = 50


class CartItem(BaseModel):
    product_id: int = Field(gt=0)
    quantity: int = Field(default=1, ge=1, le=MAX_QTY_PER_ITEM)


class CheckoutRequest(BaseModel):
    items: List[CartItem] = Field(min_length=1, max_length=MAX_LINES_PER_ORDER)
    customer_name: str
    customer_phone: str
    customer_email: Optional[str] = None
    customer_address: str
    customer_city: str
    customer_state: str
    customer_pincode: str
    notes: Optional[str] = Field(default=None, max_length=1000)

    @field_validator("customer_name")
    @classmethod
    def _name(cls, v: str) -> str:
        return strip_required(v, "Name", 255)

    @field_validator("customer_phone")
    @classmethod
    def _phone(cls, v: str) -> str:
        return normalize_indian_mobile(v)

    @field_validator("customer_email")
    @classmethod
    def _email(cls, v: Optional[str]) -> Optional[str]:
        return validate_email_optional(v)

    @field_validator("customer_address")
    @classmethod
    def _address(cls, v: str) -> str:
        return strip_required(v, "Address", 1000)

    @field_validator("customer_city")
    @classmethod
    def _city(cls, v: str) -> str:
        return strip_required(v, "City", 100)

    @field_validator("customer_state")
    @classmethod
    def _state(cls, v: str) -> str:
        return strip_required(v, "State", 100)

    @field_validator("customer_pincode")
    @classmethod
    def _pincode(cls, v: str) -> str:
        return validate_pincode(v)

    @field_validator("notes")
    @classmethod
    def _notes(cls, v: Optional[str]) -> Optional[str]:
        if v is None:
            return None
        v = v.strip()
        return v or None


class RazorpayVerifyRequest(BaseModel):
    razorpay_order_id: str = Field(min_length=1, max_length=255)
    razorpay_payment_id: str = Field(min_length=1, max_length=255)
    razorpay_signature: str = Field(min_length=1, max_length=500)


class AbandonRequest(BaseModel):
    razorpay_order_id: str = Field(min_length=1, max_length=255)


class OrderItemRead(BaseModel):
    id: int
    product_id: int
    product_name: str
    product_image_path: Optional[str] = None
    price: float
    quantity: int

    class Config:
        from_attributes = True


class OrderRead(BaseModel):
    id: int
    customer_name: str
    customer_phone: str
    customer_email: Optional[str] = None
    customer_address: str
    customer_city: str
    customer_state: str
    customer_pincode: str
    total_amount: float
    razorpay_order_id: Optional[str] = None
    razorpay_payment_id: Optional[str] = None
    status: str
    notes: Optional[str] = None
    items: List[OrderItemRead] = []
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class OrderListResponse(BaseModel):
    items: List[OrderRead]
    total: int


class OrderStatusUpdate(BaseModel):
    status: str


class OrderTrackResponse(BaseModel):
    """Public-safe order view for customer tracking (no address/contact details)."""
    id: int
    status: str
    total_amount: float
    items: List[OrderItemRead] = []
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True
