from __future__ import annotations

from datetime import datetime, date, timezone
from typing import Any, Dict, List

from fastapi import APIRouter, Depends
from sqlalchemy import func
from sqlalchemy.orm import Session, selectinload

from app.core.security import get_current_admin
from app.db.session import get_db
from app.models.category import Category
from app.models.order import Order
from app.models.product import Product
from app.schemas.order import OrderRead

router = APIRouter(prefix="/admin/stats", tags=["admin-stats"])


@router.get("", response_model=Dict[str, Any])
def get_admin_stats(
    db: Session = Depends(get_db),
    _: str = Depends(get_current_admin),
):
    """Admin dashboard statistics."""

    # ── Orders & Revenue ────────────────────────────────────────
    today_start = datetime.combine(date.today(), datetime.min.time())

    total_orders: int = db.query(func.count(Order.id)).scalar() or 0

    # Revenue — only count paid / processing / shipped / delivered
    paid_statuses = ("paid", "processing", "shipped", "delivered")
    revenue_all: float = float(
        db.query(func.sum(Order.total_amount))
        .filter(Order.status.in_(paid_statuses))
        .scalar()
        or 0
    )

    revenue_today: float = float(
        db.query(func.sum(Order.total_amount))
        .filter(
            Order.status.in_(paid_statuses),
            Order.created_at >= today_start,
        )
        .scalar()
        or 0
    )

    # This month
    first_of_month = date.today().replace(day=1)
    month_start = datetime.combine(first_of_month, datetime.min.time())
    revenue_month: float = float(
        db.query(func.sum(Order.total_amount))
        .filter(
            Order.status.in_(paid_statuses),
            Order.created_at >= month_start,
        )
        .scalar()
        or 0
    )

    # Orders by status
    status_rows = (
        db.query(Order.status, func.count(Order.id))
        .group_by(Order.status)
        .all()
    )
    by_status: Dict[str, int] = {s: c for s, c in status_rows}

    # ── Products ────────────────────────────────────────────────
    total_products: int = db.query(func.count(Product.id)).scalar() or 0

    low_stock_products = (
        db.query(Product)
        .filter(Product.stock != -1, Product.stock <= 5)
        .order_by(Product.stock.asc())
        .limit(10)
        .all()
    )
    low_stock_list = [
        {"id": p.id, "name": p.name, "stock": p.stock, "slug": p.slug}
        for p in low_stock_products
    ]

    # ── Categories ──────────────────────────────────────────────
    total_categories: int = db.query(func.count(Category.id)).scalar() or 0

    # ── Recent Orders ────────────────────────────────────────────
    recent_orders_orm = (
        db.query(Order)
        .options(selectinload(Order.items))
        .order_by(Order.created_at.desc())
        .limit(5)
        .all()
    )
    recent_orders = [OrderRead.model_validate(o) for o in recent_orders_orm]

    return {
        "orders": {
            "total": total_orders,
            "by_status": by_status,
            "revenue_all_time": round(revenue_all, 2),
            "revenue_this_month": round(revenue_month, 2),
            "revenue_today": round(revenue_today, 2),
        },
        "products": {
            "total": total_products,
            "low_stock_count": len(low_stock_list),
            "low_stock": low_stock_list,
        },
        "categories": {
            "total": total_categories,
        },
        "recent_orders": [o.model_dump() for o in recent_orders],
    }
