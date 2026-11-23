import threading
import time
from collections import defaultdict, deque

from fastapi import APIRouter, HTTPException, Request, status

from app.core.config import settings
from app.core.security import create_access_token, verify_admin_credentials
from app.schemas.auth import LoginRequest, Token

router = APIRouter(prefix="/auth", tags=["auth"])

# ── Brute-force protection ─────────────────────────────────────────────────
# One admin password guards the whole store, so throttle failed attempts per
# client IP: after LOGIN_MAX_FAILURES failures inside LOGIN_WINDOW_SECONDS that IP
# gets 429 until the oldest failure ages out. In-memory is enough for a single
# Railway instance; it resets on deploy, which is acceptable.
_failures: dict[str, deque] = defaultdict(deque)
_lock = threading.Lock()


def _client_ip(request: Request) -> str:
    # Railway's edge proxy appends the real client IP as the LAST X-Forwarded-For
    # entry; earlier entries can be forged by the client, so don't trust them.
    fwd = request.headers.get("x-forwarded-for", "")
    if fwd:
        last = fwd.split(",")[-1].strip()
        if last:
            return last
    return request.client.host if request.client else "unknown"


def _recent_failures(ip: str, now: float) -> deque:
    q = _failures[ip]
    while q and now - q[0] > settings.LOGIN_WINDOW_SECONDS:
        q.popleft()
    return q


@router.post("/login", response_model=Token)
def login(payload: LoginRequest, request: Request):
    ip = _client_ip(request)
    now = time.monotonic()
    with _lock:
        recent = _recent_failures(ip, now)
        if len(recent) >= settings.LOGIN_MAX_FAILURES:
            retry_after = int(settings.LOGIN_WINDOW_SECONDS - (now - recent[0])) + 1
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail="Too many failed login attempts. Please wait a few minutes and try again.",
                headers={"Retry-After": str(max(retry_after, 1))},
            )

    if not verify_admin_credentials(payload.username, payload.password):
        with _lock:
            _recent_failures(ip, now).append(now)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid username or password",
        )

    with _lock:
        _failures.pop(ip, None)
    token = create_access_token("admin")
    return Token(access_token=token)
