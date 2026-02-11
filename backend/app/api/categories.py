from typing import List

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.security import get_current_admin
from app.db.session import get_db
from app.models.category import Category
from app.schemas.category import CategoryCreate, CategoryFlatRead, CategoryRead, CategoryUpdate

router = APIRouter(prefix="/categories", tags=["categories"])


def _build_tree(categories: list[Category]) -> list[CategoryRead]:
    id_to_node: dict[int, CategoryRead] = {}
    roots: list[CategoryRead] = []

    for c in categories:
        node = CategoryRead.model_validate(c)
        node.children = []
        id_to_node[c.id] = node

    for c in categories:
        node = id_to_node[c.id]
        if c.parent_id and c.parent_id in id_to_node:
            parent_node = id_to_node[c.parent_id]
            parent_node.children.append(node)
        else:
            roots.append(node)

    return roots


@router.get("", response_model=List[CategoryRead])
def list_categories(db: Session = Depends(get_db)):
    categories = db.query(Category).all()
    return _build_tree(categories)


@router.get("/flat", response_model=List[CategoryFlatRead])
def list_categories_flat(db: Session = Depends(get_db)):
    return db.query(Category).order_by(Category.name.asc()).all()


@router.get("/by-slug/{slug}", response_model=CategoryFlatRead)
def get_category_by_slug(slug: str, db: Session = Depends(get_db)):
    category = db.query(Category).filter(Category.slug == slug).first()
    if not category:
        raise HTTPException(status_code=404, detail="Category not found")
    return category


@router.post("", response_model=CategoryRead, status_code=status.HTTP_201_CREATED)
def create_category(
    payload: CategoryCreate,
    db: Session = Depends(get_db),
    _: str = Depends(get_current_admin),
):
    existing = db.query(Category).filter(Category.slug == payload.slug).first()
    if existing:
        raise HTTPException(status_code=409, detail="Category slug already exists")
    category = Category(
        name=payload.name,
        slug=payload.slug,
        description=payload.description,
        parent_id=payload.parent_id,
    )
    db.add(category)
    db.commit()
    db.refresh(category)
    return category


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
    if "slug" in updates and updates["slug"] is not None:
        existing = (
            db.query(Category)
            .filter(Category.slug == updates["slug"], Category.id != category_id)
            .first()
        )
        if existing:
            raise HTTPException(status_code=409, detail="Category slug already exists")

    for field, value in updates.items():
        setattr(category, field, value)

    db.commit()
    db.refresh(category)
    return category


@router.delete("/{category_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_category(
    category_id: int,
    db: Session = Depends(get_db),
    _: str = Depends(get_current_admin),
):
    category = db.query(Category).filter(Category.id == category_id).first()
    if not category:
        raise HTTPException(status_code=404, detail="Category not found")
    db.delete(category)
    db.commit()
    return None

