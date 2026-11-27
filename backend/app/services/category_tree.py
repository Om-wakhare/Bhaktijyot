"""Helpers for the category hierarchy (descendants, inherited "world")."""
from __future__ import annotations

from typing import Dict, Iterable, List, Optional, Set

from sqlalchemy.orm import Session

from app.models.category import Category

WORLDS = ("pooja", "crystals", "gemstones")


def _rows(db: Session) -> List[tuple[int, Optional[int], Optional[str]]]:
    return db.query(Category.id, Category.parent_id, Category.world).all()


def children_map(rows: Iterable[tuple[int, Optional[int], Optional[str]]]) -> Dict[Optional[int], List[int]]:
    out: Dict[Optional[int], List[int]] = {}
    for cid, parent_id, _ in rows:
        out.setdefault(parent_id, []).append(cid)
    return out


def descendant_ids(db: Session, root_id: int, include_self: bool = True) -> Set[int]:
    """All category ids below root_id (cycle-safe)."""
    kids = children_map(_rows(db))
    seen: Set[int] = set()
    stack = [root_id]
    while stack:
        cid = stack.pop()
        if cid in seen:
            continue
        seen.add(cid)
        stack.extend(kids.get(cid, []))
    if not include_self:
        seen.discard(root_id)
    return seen


def effective_worlds(db: Session) -> Dict[int, Optional[str]]:
    """Map category id → its world, inheriting from the nearest ancestor that has one."""
    rows = _rows(db)
    parent = {cid: pid for cid, pid, _ in rows}
    own = {cid: w for cid, _, w in rows}
    result: Dict[int, Optional[str]] = {}
    for cid in own:
        cur, hops = cid, 0
        world = None
        while cur is not None and hops < 50:  # hop limit guards against bad data cycles
            if own.get(cur):
                world = own[cur]
                break
            cur = parent.get(cur)
            hops += 1
        result[cid] = world
    return result


def category_ids_in_world(db: Session, world: str) -> Set[int]:
    return {cid for cid, w in effective_worlds(db).items() if w == world}
