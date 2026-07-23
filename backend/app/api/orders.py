from __future__ import annotations

import hmac
import hashlib
from typing import Optional

import razorpay
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session, selectinload

from app.core.config import settings
from app.core.security import get_current_admin
from app.db.session import get_db
from app.models.order import Order, OrderItem
from app.models.product import Product
from app.schemas.order import (
    CheckoutRequest,
    OrderListResponse,
    OrderRead,
    OrderStatusUpdate,
    OrderTrackResponse,
    RazorpayVerifyRequest,
)

router = APIRouter(prefix="/orders", tags=["orders"])


def _get_razorpay_client():
    if not settings.RAZORPAY_KEY_ID or not settings.RAZORPAY_KEY_SECRET:
        raise HTTPException(
            status_code=500,
            detail="Razorpay is not configured. Set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET.",
        )
    return razorpay.Client(auth=(settings.RAZORPAY_KEY_ID, settings.RAZORPAY_KEY_SECRET))


@router.get("/razorpay-key")
def get_razorpay_key():
    """Return the public Razorpay key ID for the frontend."""
    return {"key_id": settings.RAZORPAY_KEY_ID}


@router.post("/checkout", response_model=OrderRead, status_code=status.HTTP_201_CREATED)
def checkout(payload: CheckoutRequest, db: Session = Depends(get_db)):
    """Create an order and a Razorpay payment order."""
    if not payload.items:
        raise HTTPException(status_code=400, detail="Cart is empty")

    # Fetch products and calculate total
    product_ids = [item.product_id for item in payload.items]
    products = db.query(Product).filter(Product.id.in_(product_ids)).all()
    product_map = {p.id: p for p in products}

    order_items = []
    total = 0.0

    for cart_item in payload.items:
        product = product_map.get(cart_item.product_id)
        if not product:
            raise HTTPException(status_code=404, detail=f"Product {cart_item.product_id} not found")
        if product.price is None:
            raise HTTPException(status_code=400, detail=f"Product '{product.name}' has no price set")

        # Stock check — stock=-1 means unlimited
        if product.stock != -1:
            if product.stock <= 0:
                raise HTTPException(
                    status_code=400,
                    detail=f"'{product.name}' is out of stock",
                )
            if product.stock < cart_item.quantity:
                raise HTTPException(
                    status_code=400,
                    detail=f"Only {product.stock} unit(s) of '{product.name}' available",
                )

        item_total = float(product.price) * cart_item.quantity
        total += item_total

        order_items.append(
            OrderItem(
                product_id=product.id,
                product_name=product.name,
                product_image_path=product.image_path,
                price=float(product.price),
                quantity=cart_item.quantity,
            )
        )

        # Reserve stock immediately to prevent overselling
        if product.stock != -1:
            product.stock -= cart_item.quantity

    # Create Razorpay order
    client = _get_razorpay_client()
    rz_order = client.order.create(
        {
            "amount": int(round(total * 100)),  # amount in paise
            "currency": "INR",
            "payment_capture": 1,
        }
    )

    # Save order in DB
    order = Order(
        customer_name=payload.customer_name,
        customer_phone=payload.customer_phone,
        customer_email=payload.customer_email,
        customer_address=payload.customer_address,
        customer_city=payload.customer_city,
        customer_state=payload.customer_state,
        customer_pincode=payload.customer_pincode,
        total_amount=total,
        razorpay_order_id=rz_order["id"],
        status="pending",
        notes=payload.notes,
        items=order_items,
    )
    db.add(order)
    db.commit()
    db.refresh(order)
    return order


@router.post("/verify-payment")
def verify_payment(payload: RazorpayVerifyRequest, db: Session = Depends(get_db)):
    """Verify Razorpay payment signature and mark order as paid."""
    order = (
        db.query(Order)
        .options(selectinload(Order.items))
        .filter(Order.razorpay_order_id == payload.razorpay_order_id)
        .first()
    )
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")

    # Verify signature
    message = f"{payload.razorpay_order_id}|{payload.razorpay_payment_id}"
    expected_signature = hmac.new(
        settings.RAZORPAY_KEY_SECRET.encode(),
        message.encode(),
        hashlib.sha256,
    ).hexdigest()

    if expected_signature != payload.razorpay_signature:
        order.status = "failed"
        db.commit()
        raise HTTPException(status_code=400, detail="Payment verification failed")

    order.razorpay_payment_id = payload.razorpay_payment_id
    order.razorpay_signature = payload.razorpay_signature
    order.status = "paid"
    db.commit()
    db.refresh(order)
    return {"status": "ok", "order_id": order.id}


@router.get("/track", response_model=OrderTrackResponse)
def track_order(
    order_id: int,
    phone: str,
    db: Session = Depends(get_db),
):
    """
    Public order tracking — no auth required.
    Returns order status only if the phone number matches the order record.
    """
    order = (
        db.query(Order)
        .options(selectinload(Order.items))
        .filter(Order.id == order_id)
        .first()
    )
    # Return 404 regardless — don't reveal whether order exists with wrong phone
    if not order or order.customer_phone != phone.strip():
        raise HTTPException(status_code=404, detail="Order not found")
    return order


# ── Admin endpoints ──────────────────────────────────────────────

@router.get("", response_model=OrderListResponse)
def list_orders(
    page: int = 1,
    limit: int = 20,
    status_filter: Optional[str] = None,
    db: Session = Depends(get_db),
    _: str = Depends(get_current_admin),
):
    q = db.query(Order).options(selectinload(Order.items))
    if status_filter:
        q = q.filter(Order.status == status_filter)
    total = q.count()
    items = q.order_by(Order.created_at.desc()).offset((page - 1) * limit).limit(limit).all()
    return {"items": items, "total": total}


@router.get("/{order_id}", response_model=OrderRead)
def get_order(
    order_id: int,
    db: Session = Depends(get_db),
    _: str = Depends(get_current_admin),
):
    order = (
        db.query(Order)
        .options(selectinload(Order.items))
        .filter(Order.id == order_id)
        .first()
    )
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    return order


@router.put("/{order_id}/status", response_model=OrderRead)
def update_order_status(
    order_id: int,
    payload: OrderStatusUpdate,
    db: Session = Depends(get_db),
    _: str = Depends(get_current_admin),
):
    valid_statuses = {"pending", "paid", "processing", "shipped", "delivered", "cancelled"}
    if payload.status not in valid_statuses:
        raise HTTPException(status_code=400, detail=f"Invalid status. Must be one of: {valid_statuses}")

    order = (
        db.query(Order)
        .options(selectinload(Order.items))
        .filter(Order.id == order_id)
        .first()
    )
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    order.status = payload.status
    db.commit()
    db.refresh(order)
    return order
