import os
from functools import lru_cache
from pathlib import Path

from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    # Core
    PROJECT_NAME: str = "Bhaktijyot"
    API_V1_STR: str = "/api"

    # Security / Auth
    JWT_SECRET_KEY: str = os.getenv("JWT_SECRET_KEY", "change-me-in-prod")
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24  # 24 hours

    ADMIN_USERNAME: str = os.getenv("ADMIN_USERNAME", "admin")
    ADMIN_PASSWORD: str = os.getenv("ADMIN_PASSWORD", "admin123")

    # Database
    DATABASE_URL: str = os.getenv(
        "DATABASE_URL",
        "postgresql+psycopg2://postgres:Om%40885687@localhost:5432/BHAKTIJYOT",
    )

    # Paths
    BASE_DIR: Path = Path(__file__).resolve().parent.parent.parent
    UPLOAD_DIR: Path = BASE_DIR / "uploads"
    GENERATED_DIR: Path = BASE_DIR / "generated"

    BACKGROUND_SUBDIR: str = "backgrounds"
    PRODUCT_SUBDIR: str = "products"

    CORS_ORIGINS: list[str] = ["*"]

    class Config:
        env_file = ".env"


@lru_cache
def get_settings() -> Settings:
    settings = Settings()

    # Ensure directories exist
    settings.UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
    settings.GENERATED_DIR.mkdir(parents=True, exist_ok=True)
    (settings.UPLOAD_DIR / settings.BACKGROUND_SUBDIR).mkdir(parents=True, exist_ok=True)
    (settings.UPLOAD_DIR / settings.PRODUCT_SUBDIR).mkdir(parents=True, exist_ok=True)

    return settings


settings = get_settings()

