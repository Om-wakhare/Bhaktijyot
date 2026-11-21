"""Mapping between public '/static/...' paths stored in the DB and files on disk.

Public paths look like 'static/uploads/products/x.webp' or 'static/generated/ABC.png'
and are served by the StaticFiles mounts in main.py, which point at
settings.UPLOAD_DIR / settings.GENERATED_DIR (these may live on a Railway volume,
so never build disk paths from BASE_DIR + public path).
"""
from __future__ import annotations

import logging
from pathlib import Path, PurePosixPath
from typing import Optional

from app.core.config import settings

log = logging.getLogger("app.storage")


def _mounts() -> tuple[tuple[str, Path], ...]:
    return (
        ("static/uploads/", settings.UPLOAD_DIR),
        ("static/generated/", settings.GENERATED_DIR),
    )


def public_path(*parts: str) -> str:
    """Build a public path, e.g. public_path('uploads', 'products', 'a.webp')."""
    return str(PurePosixPath("static", *parts))


def public_to_disk(public: Optional[str]) -> Optional[Path]:
    """Resolve a stored public path to its file on disk.

    Returns None for unknown prefixes or anything that would escape the storage root.
    """
    if not public:
        return None
    p = public.replace("\\", "/").lstrip("/")
    for prefix, root in _mounts():
        if p.startswith(prefix):
            root_dir = Path(root).resolve()
            candidate = (root_dir / p[len(prefix):]).resolve()
            if candidate != root_dir and root_dir in candidate.parents:
                return candidate
            return None
    return None


def delete_public_file(public: Optional[str]) -> None:
    """Best-effort delete of a stored file; never raises."""
    disk = public_to_disk(public)
    if disk is None:
        return
    try:
        if disk.is_file():
            disk.unlink()
    except OSError as exc:  # file in use, permissions, etc.
        log.warning("Could not delete %s: %s", disk, exc)


def is_inside(path: Path, root: Path) -> bool:
    try:
        path.resolve().relative_to(Path(root).resolve())
        return True
    except ValueError:
        return False
