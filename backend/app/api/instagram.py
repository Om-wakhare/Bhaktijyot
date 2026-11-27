from __future__ import annotations

import json
import time
import urllib.error
import urllib.request
from typing import Any, Optional

import logging

from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.security import get_current_admin
from app.db.session import get_db
from app.models.site_config import SiteConfig

log = logging.getLogger("app.instagram")

router = APIRouter(prefix="/instagram", tags=["instagram"])

IG_API = "https://graph.instagram.com/v21.0"
FIELDS = "id,media_type,thumbnail_url,media_url,permalink,caption,timestamp"

# Simple in-memory cache — one process, good enough for a storefront
_cache: dict[str, Any] = {"reels": None, "fetched_at": 0.0}


def _site_config(db: Session) -> SiteConfig:
    cfg = db.query(SiteConfig).filter(SiteConfig.id == 1).first()
    if cfg is None:
        cfg = SiteConfig(id=1)
        db.add(cfg)
        db.commit()
        db.refresh(cfg)
    return cfg


def _current_token(db: Session) -> tuple[Optional[str], Optional[str]]:
    """(token, source): a token saved by the admin refresh wins over the env var."""
    cfg = db.query(SiteConfig).filter(SiteConfig.id == 1).first()
    if cfg is not None and cfg.instagram_token:
        return cfg.instagram_token, "saved"
    if settings.INSTAGRAM_ACCESS_TOKEN:
        return settings.INSTAGRAM_ACCESS_TOKEN, "env"
    return None, None


def _fetch_from_instagram(token: Optional[str]) -> list[dict]:
    if not token:
        raise HTTPException(
            status_code=503,
            detail="Instagram not configured. Set INSTAGRAM_ACCESS_TOKEN in .env",
        )

    url = (
        f"{IG_API}/me/media"
        f"?fields={FIELDS}"
        f"&limit=18"
        f"&access_token={token}"
    )

    try:
        with urllib.request.urlopen(url, timeout=8) as resp:
            raw = json.loads(resp.read().decode())
    except urllib.error.HTTPError as e:
        # Log the details server-side; never echo third-party responses to the public
        log.warning("Instagram API error %s: %s", e.code, e.read().decode(errors="replace")[:500])
        raise HTTPException(status_code=502, detail="Instagram is unavailable right now")
    except Exception as exc:
        log.warning("Could not reach Instagram: %s", exc)
        raise HTTPException(status_code=502, detail="Instagram is unavailable right now")

    items = raw.get("data", [])
    # Reels come through as VIDEO — keep only those, cap at 9
    reels = [
        {
            "id": m["id"],
            "thumbnail_url": m.get("thumbnail_url") or m.get("media_url"),
            "permalink": m["permalink"],
            "caption": (m.get("caption") or "")[:120],
            "timestamp": m.get("timestamp", ""),
        }
        for m in items
        if m.get("media_type") == "VIDEO"
    ][:9]

    return reels


@router.get("")
def get_reels(db: Session = Depends(get_db)):
    """
    Returns up to 9 of the client's latest Instagram reels.
    Results are cached for INSTAGRAM_CACHE_TTL seconds (default 30 min).
    """
    now = time.time()
    if _cache["reels"] is not None and (now - _cache["fetched_at"]) < settings.INSTAGRAM_CACHE_TTL:
        return {"reels": _cache["reels"], "cached": True}

    try:
        reels = _fetch_from_instagram(_current_token(db)[0])
    except HTTPException:
        # Instagram down or token expired: keep showing the last good reels if we have them
        if _cache["reels"] is not None:
            return {"reels": _cache["reels"], "cached": True, "stale": True}
        raise
    _cache["reels"] = reels
    _cache["fetched_at"] = now
    return {"reels": reels, "cached": False}


@router.get("/status")
def instagram_status(db: Session = Depends(get_db), _: str = Depends(get_current_admin)):
    """Whether Instagram is connected and when the saved token expires (never the token)."""
    token, source = _current_token(db)
    cfg = db.query(SiteConfig).filter(SiteConfig.id == 1).first()
    expires_at = cfg.instagram_token_expires_at if (cfg and source == "saved") else None
    return {"configured": bool(token), "source": source, "expires_at": expires_at}


@router.post("/refresh-token")
def refresh_token(db: Session = Depends(get_db), _: str = Depends(get_current_admin)):
    """
    Extends the long-lived Instagram token by another ~60 days and saves the new
    token on the server. The token itself is never sent back to the browser.
    Press it from the admin panel about once a month.
    """
    token, _source = _current_token(db)
    if not token:
        raise HTTPException(status_code=503, detail="Instagram is not connected on the server")

    url = (
        f"{IG_API}/refresh_access_token"
        f"?grant_type=ig_refresh_token"
        f"&access_token={token}"
    )
    try:
        with urllib.request.urlopen(url, timeout=8) as resp:
            data = json.loads(resp.read().decode())
    except urllib.error.HTTPError as e:
        log.warning("Instagram token refresh failed %s: %s", e.code, e.read().decode(errors="replace")[:500])
        raise HTTPException(status_code=502, detail="Instagram refused the token refresh. The token may have expired.")
    except Exception as exc:
        log.warning("Instagram token refresh error: %s", exc)
        raise HTTPException(status_code=502, detail="Could not reach Instagram to refresh the token.")

    new_token = data.get("access_token")
    if not new_token:
        log.warning("Instagram token refresh returned no token: %s", str(data)[:300])
        raise HTTPException(status_code=502, detail="Instagram did not return a refreshed token.")

    expires_in = data.get("expires_in")
    cfg = _site_config(db)
    cfg.instagram_token = new_token
    cfg.instagram_token_expires_at = (
        datetime.now(timezone.utc) + timedelta(seconds=int(expires_in)) if expires_in else None
    )
    db.commit()
    return {
        "refreshed": True,
        "expires_in_seconds": expires_in,
        "expires_at": cfg.instagram_token_expires_at,
    }
