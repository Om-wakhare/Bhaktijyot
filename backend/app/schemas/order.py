from __future__ import annotations

from datetime import datetime
from typing import List, Optional

from pydantic import BaseModel


class CartItem(BaseModel):
    product_id: int
    quantity: int = 1


class CheckoutRequest(BaseModel):
    items: List[CartItem]
    customer_name: str
    customer_phone: str
    customer_email: Optional[str] = None
    customer_address: str
    customer_city: str
    customer_state: str
    customer_pincode: str
    notes: Optional[str] = None


class RazorpayVerifyRequest(BaseModel):
    razorpay_order_id: str
    razorpay_payment_id: str
    razorpay_signature: str


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
