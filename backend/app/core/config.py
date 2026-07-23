from functools import lru_cache
from pathlib import Path

from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

_BASE = Path(__file__).resolve().parent.parent.parent


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8")

    # Core
    PROJECT_NAME: str = "Bhaktijyot"
    API_V1_STR: str = "/api"

    # Database
    DATABASE_URL: str

    @field_validator("DATABASE_URL", mode="before")
    @classmethod
    def fix_postgres_scheme(cls, v: str) -> str:
        # Railway injects postgresql:// but psycopg2 needs postgresql+psycopg2://
        if v and v.startswith("postgresql://"):
            return v.replace("postgresql://", "postgresql+psycopg2://", 1)
        return v

    # Auth
    JWT_SECRET_KEY: str = "change-me-in-prod"
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24
    ADMIN_USERNAME: str = "admin"
    ADMIN_PASSWORD: str = "admin123"

    # Razorpay
    RAZORPAY_KEY_ID: str = ""
    RAZORPAY_KEY_SECRET: str = ""

    # Instagram Graph API
    INSTAGRAM_ACCESS_TOKEN: str = ""
    INSTAGRAM_CACHE_TTL: int = 1800  # 30 minutes

    # CORS — set to your Vercel domain in production
    CORS_ORIGINS: list[str] = ["*"]

    # Storage paths — override via env vars to point at a Railway volume
    # e.g. UPLOAD_DIR=/app/data/uploads  GENERATED_DIR=/app/data/generated
    BASE_DIR: Path = _BASE
    UPLOAD_DIR: Path = _BASE / "uploads"
    GENERATED_DIR: Path = _BASE / "generated"
    BACKGROUND_SUBDIR: str = "backgrounds"
    PRODUCT_SUBDIR: str = "products"
    CERT_TEMPLATES_DIR: Path = _BASE / "uploads" / "cert_templates"
    TERMS_TEMPLATE_PATH: Path = _BASE / "uploads" / "templates" / "terms.png"


@lru_cache
def get_settings() -> Settings:
    s = Settings()
    s.UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
    s.GENERATED_DIR.mkdir(parents=True, exist_ok=True)
    (s.UPLOAD_DIR / s.BACKGROUND_SUBDIR).mkdir(parents=True, exist_ok=True)
    (s.UPLOAD_DIR / s.PRODUCT_SUBDIR).mkdir(parents=True, exist_ok=True)
    s.CERT_TEMPLATES_DIR.mkdir(parents=True, exist_ok=True)
    s.TERMS_TEMPLATE_PATH.parent.mkdir(parents=True, exist_ok=True)
    return s


settings = get_settings()
