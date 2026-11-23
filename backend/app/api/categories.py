from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.security import get_current_admin
from app.db.session import get_db
from app.models.category import Category
from app.models.product import Product
from app.schemas.category import CategoryCreate, CategoryFlatRead, CategoryRead, CategoryUpdate
from app.services.category_tree import descendant_ids, effective_worlds

router = APIRouter(prefix="/categories", tags=["categories"])


def _node(c: Category) -> dict:
    # Built from columns only — touching c.children would lazy-load one query per row
    return {
        "id": c.id, "name": c.name, "slug": c.slug, "description": c.description,
        "parent_id": c.parent_id, "world": c.world, "children": [],
    }


def _build_tree(categories: list[Category]) -> list[dict]:
    nodes = {c.id: _node(c) for c in categories}
    roots: list[dict] = []
    for c in categories:
        node = nodes[c.id]
        if c.parent_id and c.parent_id in nodes and c.parent_id != c.id:
            nodes[c.parent_id]["children"].append(node)
        else:
            roots.append(node)
    return roots


def _check_parent(db: Session, category_id: Optional[int], parent_id: Optional[int]) -> None:
    if parent_id is None:
        return
    if not db.query(Category.id).filter(Category.id == parent_id).first():
        raise HTTPException(status_code=400, detail="Parent category not found")
    if category_id is not None and parent_id in descendant_ids(db, category_id):
        raise HTTPException(
            status_code=400,
            detail="A category can't be placed inside itself or one of its own subcategories.",
        )


@router.get("", response_model=List[CategoryRead])
def list_categories(db: Session = Depends(get_db)):
    categories = db.query(Category).order_by(Category.name.asc()).all()
    return _build_tree(categories)


@router.get("/flat", response_model=List[CategoryFlatRead])
def list_categories_flat(db: Session = Depends(get_db)):
    """Flat list for menus. `world` here is the effective world (inherited from parents)."""
    categories = db.query(Category).order_by(Category.name.asc()).all()
    worlds = effective_worlds(db)
    return [
        {
            "id": c.id, "name": c.name, "slug": c.slug, "description": c.description,
            "parent_id": c.parent_id, "world": worlds.get(c.id),
        }
        for c in categories
    ]


@router.get("/by-slug/{slug}", response_model=CategoryFlatRead)
def get_category_by_slug(slug: str, db: Session = Depends(get_db)):
    category = db.query(Category).filter(Category.slug == slug).first()
    if not category:
        raise HTTPException(status_code=404, detail="Category not found")
    return {
        "id": category.id, "name": category.name, "slug": category.slug,
        "description": category.description, "parent_id": category.parent_id,
        "world": effective_worlds(db).get(category.id),
    }


@router.post("", response_model=CategoryRead, status_code=status.HTTP_201_CREATED)
def create_category(
    payload: CategoryCreate,
    db: Session = Depends(get_db),
    _: str = Depends(get_current_admin),
):
    if db.query(Category.id).filter(Category.slug == payload.slug).first():
        raise HTTPException(status_code=409, detail="Category slug already exists")
    _check_parent(db, None, payload.parent_id)
    category = Category(
        name=payload.name,
        slug=payload.slug,
        description=payload.description,
        parent_id=payload.parent_id,
        world=payload.world,
    )
    db.add(category)
    db.commit()
    db.refresh(category)
    return _node(category)


@router.put("/{category_id}", response_model=CategoryRead)
def update_category(
    category_id: int,
    payload: CategoryUpdate,
    db: Session = Depends(get_db),
    _: str = Depends(get_current_admin),
):
    category = db.query(Category).filter(Category.id == category_id).first()
    if not category:
        raise HTTPException(status_code=404, detail="Category not found")

    updates = payload.model_dump(exclude_unset=True)
    if updates.get("slug") is not None:
        clash = (
            db.query(Category.id)
            .filter(Category.slug == updates["slug"], Category.id != category_id)
            .first()
        )
        if clash:
            raise HTTPException(status_code=409, detail="Category slug already exists")
    if "parent_id" in updates:
        _check_parent(db, category_id, updates["parent_id"])
    if updates.get("name") is not None:
        updates["name"] = updates["name"].strip()

    for field, value in updates.items():
        setattr(category, field, value)

    db.commit()
    db.refresh(category)
    return _node(category)


@router.delete("/{category_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_category(
    category_id: int,
    db: Session = Depends(get_db),
    _: str = Depends(get_current_admin),
):
    category = db.query(Category).filter(Category.id == category_id).first()
    if not category:
        raise HTTPException(status_code=404, detail="Category not found")

    child_count = db.query(Category.id).filter(Category.parent_id == category_id).count()
    if child_count:
        raise HTTPException(
            status_code=409,
            detail=f"This category has {child_count} subcategor{'y' if child_count == 1 else 'ies'}. "
                   "Move or delete them first.",
        )
    product_count = db.query(Product.id).filter(Product.category_id == category_id).count()
    if product_count:
        raise HTTPException(
            status_code=409,
            detail=f"{product_count} product{'' if product_count == 1 else 's'} still use this category. "
                   "Move them to another category first.",
        )

    db.delete(category)
    db.commit()
    return None
