"""Orders, checkout and Razorpay payment flow.

Stock lifecycle
---------------
* Checkout reserves stock (decrements Product.stock) and creates a `pending` order.
* Payment success (verify-payment, webhook, or the reconciliation sweep) -> `paid`.
* Customer closes the Razorpay window -> POST /orders/abandon -> `abandoned`, stock released.
* Pending orders older than ORDER_RESERVATION_MINUTES are checked against Razorpay by a
  background sweep: paid ones are marked `paid`, the rest become `abandoned` (stock released).
* Admin cancelling an order releases its stock; reviving a cancelled/abandoned order re-reserves it.

Every status change that moves stock is done with a conditional UPDATE
(`... WHERE status IN (...)`) so concurrent requests/workers can never release or
reserve the same order's stock twice.
"""
from __future__ import annotations

import hashlib
import hmac
import json
import logging
from datetime import timedelta
from decimal import Decimal
from typing import Dict, Iterable, Optional, Tuple

import razorpay
from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy import update
from sqlalchemy.orm import Session, selectinload

from app.core.config import settings
from app.core.security import get_current_admin
from app.core.validators import phones_match, utcnow
from app.db.session import SessionLocal, get_db
from app.models.order import Order, OrderItem
from app.models.product import Product
from app.schemas.order import (
    AbandonRequest,
    CheckoutRequest,
    OrderListResponse,
    OrderRead,
    OrderStatusUpdate,
    OrderTrackResponse,
    RazorpayVerifyRequest,
)

log = logging.getLogger("app.orders")

router = APIRouter(prefix="/orders", tags=["orders"])

# Statuses whose items currently hold reserved stock ("failed" is a legacy value
# written by older code, which never released stock for it).
STOCK_HOLDING = {"pending", "failed", "paid", "processing", "shipped", "delivered"}
STOCK_RELEASED = {"cancelled", "abandoned"}
PAID_STATUSES = {"paid", "processing", "shipped", "delivered"}
ADMIN_SETTABLE = {"pending", "paid", "processing", "shipped", "delivered", "cancelled"}
ALL_STATUSES = STOCK_HOLDING | STOCK_RELEASED


# ── Razorpay helpers ────────────────────────────────────────────────────────

def _razorpay_configured() -> bool:
    return bool(settings.RAZORPAY_KEY_ID and settings.RAZORPAY_KEY_SECRET)


def _get_razorpay_client() -> razorpay.Client:
    if not _razorpay_configured():
        raise HTTPException(
            status_code=503,
            detail="Online payments are not available right now. Please contact us on WhatsApp to order.",
        )
    return razorpay.Client(auth=(settings.RAZORPAY_KEY_ID, settings.RAZORPAY_KEY_SECRET))


def _razorpay_payment_state(razorpay_order_id: str) -> Tuple[Optional[str], Optional[str]]:
    """Ask Razorpay whether an order was paid.

    Returns (state, payment_id): state is "paid", "attempted" or "created",
    or None when Razorpay couldn't be reached or isn't configured.
    """
    if not _razorpay_configured():
        return None, None
    try:
        client = razorpay.Client(auth=(settings.RAZORPAY_KEY_ID, settings.RAZORPAY_KEY_SECRET))
        rz_order = client.order.fetch(razorpay_order_id)
        state = rz_order.get("status")
        payment_id = None
        if state == "paid":
            payments = client.order.payments(razorpay_order_id).get("items", [])
            captured = [p for p in payments if p.get("status") == "captured"]
            if captured:
                payment_id = captured[0].get("id")
        return state, payment_id
    except Exception as exc:  # network / API errors — the caller retries later
        log.warning("Razorpay lookup failed for %s: %s", razorpay_order_id, exc)
        return None, None


def _signature_ok(message: bytes, signature: str, secret: str) -> bool:
    expected = hmac.new(secret.encode(), message, hashlib.sha256).hexdigest()
    return hmac.compare_digest(expected, signature or "")


# ── Stock helpers ───────────────────────────────────────────────────────────

def _quantities(items: Iterable) -> Dict[int, int]:
    qty: Dict[int, int] = {}
    for it in items:
        qty[it.product_id] = qty.get(it.product_id, 0) + it.quantity
    return qty


def _lock_products(db: Session, ids: Iterable[int]) -> Dict[int, Product]:
    ids = sorted(set(ids))  # consistent lock order avoids deadlocks
    if not ids:
        return {}
    rows = db.query(Product).filter(Product.id.in_(ids)).order_by(Product.id).with_for_update().all()
    return {p.id: p for p in rows}


def _reserve(db: Session, qty: Dict[int, int], *, strict: bool) -> list[str]:
    """Decrement tracked stock. strict=True raises 409 on a shortage; otherwise it
    clamps at 0 and returns warnings (used when a payment has already happened)."""
    products = _lock_products(db, qty)
    warnings: list[str] = []
    for pid, q in qty.items():
        p = products.get(pid)
        if p is None or p.stock is None or p.stock == -1:
            continue
        if p.stock < q:
            if strict:
                raise HTTPException(
                    status_code=409,
                    detail=f"Not enough stock for '{p.name}' (available: {max(p.stock, 0)}, needed: {q}).",
                )
            warnings.append(f"'{p.name}' needed {q} but only {max(p.stock, 0)} in stock")
            p.stock = 0
        else:
            p.stock -= q
    return warnings


def _release(db: Session, qty: Dict[int, int]) -> None:
    products = _lock_products(db, qty)
    for pid, q in qty.items():
        p = products.get(pid)
        if p is None or p.stock is None or p.stock == -1:
            continue
        p.stock += q


def _transition(db: Session, order_id: int, from_statuses: Iterable[str], to_status: str) -> bool:
    """Atomically move an order between statuses. True only for the caller that won."""
    res = db.execute(
        update(Order)
        .where(Order.id == order_id, Order.status.in_(list(from_statuses)))
        .values(status=to_status, updated_at=utcnow())
        .execution_options(synchronize_session=False)
    )
    return res.rowcount == 1


def _append_note(order: Order, note: str) -> None:
    order.notes = f"{order.notes}\n{note}" if order.notes else note


def _mark_paid(db: Session, order: Order, payment_id: Optional[str], signature: Optional[str] = None) -> None:
    """Mark an order paid (idempotent). Re-reserves stock if it had been released."""
    if order.status in PAID_STATUSES:
        return
    previous = order.status
    if not _transition(db, order.id, ALL_STATUSES - PAID_STATUSES, "paid"):
        return  # another request already marked it paid
    order.status = "paid"
    if previous in STOCK_RELEASED:
        warnings = _reserve(db, _quantities(order.items), strict=False)
        _append_note(order, "[system] Payment completed after the reservation was released; stock re-reserved.")
        for w in warnings:
            _append_note(order, f"[system] Stock shortage: {w}. Please check inventory.")
    if payment_id:
        order.razorpay_payment_id = payment_id
    if signature:
        order.razorpay_signature = signature


def _abandon(db: Session, order: Order, reason: str) -> bool:
    if not _transition(db, order.id, {"pending", "failed"}, "abandoned"):
        return False
    order.status = "abandoned"
    _release(db, _quantities(order.items))
    _append_note(order, f"[system] {reason}")
    return True


def expire_stale_reservations(db: Session, limit: int = 25) -> int:
    """Reconcile pending orders older than the reservation window. Returns how many were settled."""
    cutoff = utcnow() - timedelta(minutes=settings.ORDER_RESERVATION_MINUTES)
    stale = (
        db.query(Order)
        .options(selectinload(Order.items))
        .filter(Order.status.in_(("pending", "failed")), Order.created_at < cutoff)
        .order_by(Order.created_at.asc())
        .limit(limit)
        .all()
    )
    handled = 0
    for order in stale:
        try:
            if order.razorpay_order_id and _razorpay_configured():
                state, payment_id = _razorpay_payment_state(order.razorpay_order_id)
                if state is None:
                    continue  # couldn't verify — try again on the next sweep
                if state == "paid":
                    _mark_paid(db, order, payment_id)
                    _append_note(order, "[system] Payment confirmed by reconciliation.")
                    db.commit()
                    handled += 1
                    continue
            if _abandon(db, order, "Payment not completed in time; reserved stock released."):
                handled += 1
            db.commit()
        except Exception:  # keep going with the other orders
            db.rollback()
            log.exception("Failed to reconcile order %s", order.id)
    return handled


def run_reservation_sweep() -> None:
    """Entry point for the background job (uses its own DB session)."""
    db = SessionLocal()
    try:
        n = expire_stale_reservations(db)
        if n:
            log.info("Reservation sweep settled %d order(s)", n)
    finally:
        db.close()


# ── Public endpoints ────────────────────────────────────────────────────────

@router.get("/razorpay-key")
def get_razorpay_key():
    """Return the public Razorpay key ID for the frontend."""
    return {"key_id": settings.RAZORPAY_KEY_ID}


@router.post("/checkout", response_model=OrderRead, status_code=status.HTTP_201_CREATED)
def checkout(payload: CheckoutRequest, db: Session = Depends(get_db)):
    """Validate the cart, reserve stock and create the Razorpay order."""
    qty = _quantities(payload.items)

    # 1) Validate products and price everything server-side (never trust client prices)
    products = {p.id: p for p in db.query(Product).filter(Product.id.in_(list(qty))).all()}
    total = Decimal("0")
    for pid, q in qty.items():
        p = products.get(pid)
        if p is None or p.is_active is False:
            raise HTTPException(
                status_code=400,
                detail="An item in your cart is no longer available. Please remove it and try again.",
            )
        if p.price is None or Decimal(str(p.price)) <= 0:
            raise HTTPException(
                status_code=400,
                detail=f"'{p.name}' is available on request only. Please contact us on WhatsApp.",
            )
        if p.stock is not None and p.stock != -1 and p.stock < q:
            msg = f"'{p.name}' is out of stock" if p.stock <= 0 else f"Only {p.stock} unit(s) of '{p.name}' available"
            raise HTTPException(status_code=400, detail=msg)
        total += Decimal(str(p.price)) * q
    total = total.quantize(Decimal("0.01"))
    amount_paise = int(total * 100)
    if amount_paise < 100:
        raise HTTPException(status_code=400, detail="Order total must be at least ₹1.")

    # 2) Create the Razorpay order before taking row locks (it's a network call)
    client = _get_razorpay_client()
    try:
        rz_order = client.order.create({"amount": amount_paise, "currency": "INR", "payment_capture": 1})
    except Exception as exc:
        log.error("Razorpay order creation failed: %s", exc)
        raise HTTPException(status_code=502, detail="Payment gateway is not responding. Please try again in a minute.")

    # 3) Lock the rows, reserve stock (re-checked under the lock) and save the order
    _reserve(db, qty, strict=True)
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
        items=[
            OrderItem(
                product_id=pid,
                product_name=products[pid].name,
                product_image_path=products[pid].image_path,
                price=products[pid].price,
                quantity=q,
            )
            for pid, q in qty.items()
        ],
    )
    db.add(order)
    db.commit()
    db.refresh(order)
    return order


def _order_by_rz_id(db: Session, razorpay_order_id: str, lock: bool = False) -> Optional[Order]:
    q = db.query(Order).options(selectinload(Order.items)).filter(Order.razorpay_order_id == razorpay_order_id)
    if lock:
        q = q.with_for_update(of=Order)
    return q.first()


@router.post("/verify-payment")
def verify_payment(payload: RazorpayVerifyRequest, db: Session = Depends(get_db)):
    """Verify the Razorpay checkout signature and mark the order paid."""
    if not _razorpay_configured():
        raise HTTPException(status_code=503, detail="Payments are not configured.")
    message = f"{payload.razorpay_order_id}|{payload.razorpay_payment_id}".encode()
    if not _signature_ok(message, payload.razorpay_signature, settings.RAZORPAY_KEY_SECRET):
        # Leave the order untouched: a forged request must not affect a real customer's order
        raise HTTPException(status_code=400, detail="Payment verification failed")

    order = _order_by_rz_id(db, payload.razorpay_order_id, lock=True)
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    _mark_paid(db, order, payload.razorpay_payment_id, payload.razorpay_signature)
    db.commit()
    return {"status": "ok", "order_id": order.id}


@router.post("/abandon")
def abandon_order(payload: AbandonRequest, db: Session = Depends(get_db)):
    """Called when the customer closes the Razorpay window without paying.

    Releases the stock reservation straight away, unless Razorpay shows a payment
    attempt (a UPI approval may still arrive) — then the order is left for the
    reconciliation sweep to settle once the reservation window ends.
    """
    order = _order_by_rz_id(db, payload.razorpay_order_id)
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    if order.status not in ("pending", "failed"):
        return {"status": order.status}

    state, payment_id = _razorpay_payment_state(order.razorpay_order_id)
    if state == "paid":
        _mark_paid(db, order, payment_id)
        db.commit()
    elif state == "created" or (state is None and not _razorpay_configured()):
        _abandon(db, order, "Customer closed the payment window; reserved stock released.")
        db.commit()
    # "attempted" or unknown -> leave pending; the sweep settles it after the window
    db.refresh(order)
    return {"status": order.status}


@router.post("/razorpay-webhook", include_in_schema=False)
async def razorpay_webhook(request: Request, db: Session = Depends(get_db)):
    """Razorpay -> server notification.

    Set up on Razorpay Dashboard -> Webhooks: URL https://<backend>/api/orders/razorpay-webhook,
    events `payment.captured` and `order.paid`, secret = RAZORPAY_WEBHOOK_SECRET.
    """
    if not settings.RAZORPAY_WEBHOOK_SECRET:
        raise HTTPException(status_code=503, detail="Webhook secret not configured")
    body = await request.body()
    if not _signature_ok(body, request.headers.get("X-Razorpay-Signature", ""), settings.RAZORPAY_WEBHOOK_SECRET):
        raise HTTPException(status_code=400, detail="Invalid signature")
    try:
        event = json.loads(body)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid payload")

    if event.get("event") in ("payment.captured", "order.paid"):
        payload = event.get("payload", {})
        payment = (payload.get("payment") or {}).get("entity") or {}
        rz_order_id = payment.get("order_id") or ((payload.get("order") or {}).get("entity") or {}).get("id")
        if rz_order_id:
            order = _order_by_rz_id(db, rz_order_id, lock=True)
            if order:
                _mark_paid(db, order, payment.get("id"))
                db.commit()
    # Always 200 for events we don't handle, so Razorpay doesn't keep retrying them
    return {"status": "ok"}


@router.get("/track", response_model=OrderTrackResponse)
def track_order(order_id: int, phone: str, db: Session = Depends(get_db)):
    """Public order tracking — returns the order only if the phone number matches."""
    order = db.query(Order).options(selectinload(Order.items)).filter(Order.id == order_id).first()
    # Same 404 either way — never reveal whether an order exists for a wrong phone
    if not order or not phones_match(order.customer_phone, phone):
        raise HTTPException(status_code=404, detail="Order not found")
    return order


# ── Admin endpoints ─────────────────────────────────────────────────────────

@router.get("", response_model=OrderListResponse)
def list_orders(
    page: int = 1,
    limit: int = 20,
    status_filter: Optional[str] = None,
    db: Session = Depends(get_db),
    _: str = Depends(get_current_admin),
):
    if page < 1 or not (1 <= limit <= 100):
        raise HTTPException(status_code=400, detail="Invalid pagination parameters")
    q = db.query(Order).options(selectinload(Order.items))
    if status_filter:
        q = q.filter(Order.status == status_filter)
    total = q.count()
    items = q.order_by(Order.created_at.desc(), Order.id.desc()).offset((page - 1) * limit).limit(limit).all()
    return {"items": items, "total": total}


@router.get("/{order_id}", response_model=OrderRead)
def get_order(order_id: int, db: Session = Depends(get_db), _: str = Depends(get_current_admin)):
    order = db.query(Order).options(selectinload(Order.items)).filter(Order.id == order_id).first()
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
    new = payload.status
    if new not in ADMIN_SETTABLE:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid status. Must be one of: {', '.join(sorted(ADMIN_SETTABLE))}",
        )

    order = (
        db.query(Order).options(selectinload(Order.items))
        .filter(Order.id == order_id).with_for_update(of=Order).first()
    )
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")

    old = order.status
    if old == new:
        return order

    qty = _quantities(order.items)
    if old in STOCK_HOLDING and new in STOCK_RELEASED:
        _release(db, qty)
    elif old in STOCK_RELEASED and new in STOCK_HOLDING:
        _reserve(db, qty, strict=True)  # 409 if the stock has since been sold

    order.status = new
    order.updated_at = utcnow()
    db.commit()
    db.refresh(order)
    return order
