from __future__ import annotations

from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.core.security import get_current_admin
from app.db.session import get_db
from app.models.product import Product
from app.models.review import Review
from app.schemas.review import (
    ReviewCreate,
    ReviewFeedResponse,
    ReviewListResponse,
    ReviewRead,
    ReviewUpdateByAdmin,
)

router = APIRouter(prefix="/reviews", tags=["reviews"])


def _recalculate_product_rating(product_id: int, db: Session) -> None:
    avg_value, count_value = (
        db.query(func.avg(Review.rating), func.count(Review.id))
        .filter(Review.product_id == product_id, Review.is_approved.is_(True))
        .one()
    )
    product = db.query(Product).filter(Product.id == product_id).first()
    if not product:
        return
    product.rating_count = int(count_value or 0)
    product.rating_avg = float(avg_value) if avg_value is not None else None


@router.get("/feed", response_model=ReviewFeedResponse)
def reviews_feed(limit: int = 12, db: Session = Depends(get_db)):
    if limit < 1 or limit > 50:
        raise HTTPException(status_code=400, detail="limit must be between 1 and 50")

    rows = (
        db.query(
            Review.id,
            Review.product_id,
            Product.name.label("product_name"),
            Product.image_path.label("product_image_path"),
            Review.rating,
            Review.title,
            Review.comment,
            Review.reviewer_name,
            Review.is_verified_offline,
            Review.created_at,
        )
        .join(Product, Product.id == Review.product_id)
        .filter(Review.is_approved.is_(True))
        .order_by(Review.created_at.desc(), Review.id.desc())
        .limit(limit)
        .all()
    )

    items = [
        {
            "id": r.id,
            "product_id": r.product_id,
            "product_name": r.product_name,
            "product_image_path": r.product_image_path,
            "rating": r.rating,
            "title": r.title,
            "comment": r.comment,
            "reviewer_name": r.reviewer_name,
            "is_verified_offline": r.is_verified_offline,
            "created_at": r.created_at,
        }
        for r in rows
    ]
    return {"items": items}


@router.get("/product/{product_id}", response_model=ReviewListResponse)
def list_product_reviews(
    product_id: int,
    page: int = 1,
    limit: int = 10,
    approved_only: bool = True,
    db: Session = Depends(get_db),
):
    if page < 1:
        raise HTTPException(status_code=400, detail="page must be >= 1")
    if limit < 1 or limit > 100:
        raise HTTPException(status_code=400, detail="limit must be between 1 and 100")

    product = db.query(Product).filter(Product.id == product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")

    query = db.query(Review).filter(Review.product_id == product_id)
    if approved_only:
        query = query.filter(Review.is_approved.is_(True))

    total = query.count()
    items = (
        query.order_by(Review.created_at.desc(), Review.id.desc())
        .offset((page - 1) * limit)
        .limit(limit)
        .all()
    )

    return ReviewListResponse(items=items, page=page, limit=limit, total=total)


@router.post("/product/{product_id}", response_model=ReviewRead, status_code=201)
def create_review(
    product_id: int,
    payload: ReviewCreate,
    db: Session = Depends(get_db),
):
    product = db.query(Product).filter(Product.id == product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")

    review = Review(
        product_id=product_id,
        reviewer_name=payload.reviewer_name,
        reviewer_phone=payload.reviewer_phone,
        reviewer_email=payload.reviewer_email,
        rating=payload.rating,
        title=payload.title,
        comment=payload.comment,
        is_approved=False,
        is_verified_offline=False,
    )

    db.add(review)
    db.commit()
    db.refresh(review)
    return review


@router.get("/admin", response_model=ReviewListResponse)
def admin_list_reviews(
    product_id: Optional[int] = None,
    approved: Optional[bool] = None,
    page: int = 1,
    limit: int = 20,
    db: Session = Depends(get_db),
    _: str = Depends(get_current_admin),
):
    if page < 1:
        raise HTTPException(status_code=400, detail="page must be >= 1")
    if limit < 1 or limit > 100:
        raise HTTPException(status_code=400, detail="limit must be between 1 and 100")

    query = db.query(Review)
    if product_id is not None:
        query = query.filter(Review.product_id == product_id)
    if approved is not None:
        query = query.filter(Review.is_approved.is_(approved))

    total = query.count()
    items = (
        query.order_by(Review.created_at.desc(), Review.id.desc())
        .offset((page - 1) * limit)
        .limit(limit)
        .all()
    )

    return ReviewListResponse(items=items, page=page, limit=limit, total=total)


@router.put("/admin/{review_id}", response_model=ReviewRead)
def admin_update_review(
    review_id: int,
    payload: ReviewUpdateByAdmin,
    db: Session = Depends(get_db),
    _: str = Depends(get_current_admin),
):
    review = db.query(Review).filter(Review.id == review_id).first()
    if not review:
        raise HTTPException(status_code=404, detail="Review not found")

    updates = payload.model_dump(exclude_unset=True)
    for field, value in updates.items():
        setattr(review, field, value)

    db.commit()

    _recalculate_product_rating(review.product_id, db)
    db.commit()

    db.refresh(review)
    return review


@router.delete("/admin/{review_id}", status_code=204)
def admin_delete_review(
    review_id: int,
    db: Session = Depends(get_db),
    _: str = Depends(get_current_admin),
):
    review = db.query(Review).filter(Review.id == review_id).first()
    if not review:
        raise HTTPException(status_code=404, detail="Review not found")

    product_id = review.product_id
    db.delete(review)
    db.commit()

    _recalculate_product_rating(product_id, db)
    db.commit()

    return None
