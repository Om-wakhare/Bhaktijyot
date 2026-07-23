from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from sqlalchemy import inspect as sa_inspect, text

from app.api import auth, categories, products, certificates, reviews, site_config, orders, consultations, instagram
from app.api import admin_stats
from app.core.config import settings
from app.db.session import Base, engine


def _sync_columns():
    """Add any missing columns and backfill NULLs in columns that have scalar defaults."""
    inspector = sa_inspect(engine)
    with engine.connect() as conn:
        for table_name, table in Base.metadata.tables.items():
            if not inspector.has_table(table_name):
                continue
            existing = {col["name"] for col in inspector.get_columns(table_name)}
            for col in table.columns:
                if col.name not in existing:
                    col_type = col.type.compile(engine.dialect)
                    default_clause = ""
                    if col.default is not None and col.default.is_scalar:
                        default_val = col.default.arg
                        if isinstance(default_val, bool):
                            default_clause = f" DEFAULT {'TRUE' if default_val else 'FALSE'}"
                        elif isinstance(default_val, (int, float)):
                            default_clause = f" DEFAULT {default_val}"
                        elif isinstance(default_val, str):
                            safe = default_val.replace("'", "''")
                            default_clause = f" DEFAULT '{safe}'"
                    conn.execute(
                        text(f'ALTER TABLE {table_name} ADD COLUMN {col.name} {col_type}{default_clause}')
                    )
                else:
                    # Column exists — backfill any NULLs that slipped in before we had DEFAULT
                    if col.default is not None and col.default.is_scalar:
                        default_val = col.default.arg
                        if isinstance(default_val, bool):
                            sql_val = 'TRUE' if default_val else 'FALSE'
                        elif isinstance(default_val, (int, float)):
                            sql_val = str(default_val)
                        else:
                            continue
                        conn.execute(
                            text(f'UPDATE {table_name} SET {col.name} = {sql_val} WHERE {col.name} IS NULL')
                        )
        conn.commit()


def create_app() -> FastAPI:
    app = FastAPI(title=settings.PROJECT_NAME, redirect_slashes=False)

    # Health check registered first — responds even if DB startup fails
    @app.get("/health", include_in_schema=False)
    def health():
        return {"status": "ok"}

    @app.on_event("startup")
    def _startup() -> None:
        try:
            Base.metadata.create_all(bind=engine)
            _sync_columns()
        except Exception as exc:
            import logging
            logging.getLogger("app").error("DB startup error: %s", exc)

    # CORS
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.CORS_ORIGINS,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    # API routes
    app.include_router(auth.router, prefix=settings.API_V1_STR)
    app.include_router(categories.router, prefix=settings.API_V1_STR)
    app.include_router(products.router, prefix=settings.API_V1_STR)
    app.include_router(certificates.router, prefix=settings.API_V1_STR)
    app.include_router(reviews.router, prefix=settings.API_V1_STR)
    app.include_router(site_config.router, prefix=settings.API_V1_STR)
    app.include_router(orders.router, prefix=settings.API_V1_STR)
    app.include_router(consultations.router, prefix=settings.API_V1_STR)
    app.include_router(instagram.router, prefix=settings.API_V1_STR)
    app.include_router(admin_stats.router, prefix=settings.API_V1_STR)

    # Static file serving for uploads and generated certificates
    base_dir = settings.BASE_DIR
    uploads_dir = settings.UPLOAD_DIR
    generated_dir = settings.GENERATED_DIR

    app.mount(
        "/static/uploads",
        StaticFiles(directory=str(uploads_dir)),
        name="uploads",
    )
    app.mount(
        "/static/generated",
        StaticFiles(directory=str(generated_dir)),
        name="generated",
    )

    return app


app = create_app()

