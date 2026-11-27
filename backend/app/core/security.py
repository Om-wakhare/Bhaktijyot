import hmac
from datetime import datetime, timedelta, timezone
from typing import Any, Optional

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import JWTError, jwt

from app.core.config import settings

bearer_scheme = HTTPBearer(auto_error=True)
optional_bearer_scheme = HTTPBearer(auto_error=False)

# Values shipped as examples/defaults — running production with these is unsafe.
INSECURE_JWT_SECRETS = {"change-me-in-prod", "change-me-to-a-long-random-secret", ""}
INSECURE_ADMIN_PASSWORDS = {"admin123", "changeme", "admin", "password", ""}


def create_access_token(subject: str, expires_delta: Optional[timedelta] = None) -> str:
    if expires_delta is None:
        expires_delta = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    expire = datetime.now(timezone.utc) + expires_delta
    to_encode: dict[str, Any] = {"sub": subject, "exp": expire}
    return jwt.encode(to_encode, settings.JWT_SECRET_KEY, algorithm=settings.JWT_ALGORITHM)


def verify_admin_credentials(username: str, password: str) -> bool:
    # Constant-time comparisons so response timing doesn't leak how much matched.
    # Evaluate both before combining so a wrong username costs the same as a wrong password.
    user_ok = hmac.compare_digest(username.encode(), settings.ADMIN_USERNAME.encode())
    pass_ok = hmac.compare_digest(password.encode(), settings.ADMIN_PASSWORD.encode())
    return user_ok and pass_ok


def _is_admin_token(token: str) -> bool:
    try:
        payload = jwt.decode(token, settings.JWT_SECRET_KEY, algorithms=[settings.JWT_ALGORITHM])
    except JWTError:
        return False
    return payload.get("sub") == "admin"


def get_current_admin(
    credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme),
) -> str:
    if not _is_admin_token(credentials.credentials):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return "admin"


def get_optional_admin(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(optional_bearer_scheme),
) -> bool:
    """True when the request carries a valid admin token; never raises.

    Used by public endpoints that expose extra data (drafts, etc.) to admins only.
    """
    if credentials is None:
        return False
    return _is_admin_token(credentials.credentials)


def require_admin_for(flag: bool, is_admin: bool, what: str) -> None:
    """Raise 401 when a public endpoint is asked for admin-only data."""
    if flag and not is_admin:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Admin authentication required for {what}",
            headers={"WWW-Authenticate": "Bearer"},
        )
