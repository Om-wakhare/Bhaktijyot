import logging
import threading

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from sqlalchemy import inspect as sa_inspect, text

from app.api import auth, categories, products, certificates, reviews, site_config, orders, consultations, instagram
from app.api import admin_stats
from app.core.config import settings
from app.core.security import INSECURE_ADMIN_PASSWORDS, INSECURE_JWT_SECRETS
from app.db.session import Base, engine

log = logging.getLogger("app")


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


_sweep_stop = threading.Event()


def _reservation_sweep_loop() -> None:
    from app.api.orders import run_reservation_sweep

    while not _sweep_stop.wait(settings.RESERVATION_SWEEP_SECONDS):
        try:
            run_reservation_sweep()
        except Exception:  # never let the loop die
            log.exception("Reservation sweep failed")


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
            log.error("DB startup error: %s", exc)

        # Shout loudly if production runs with example secrets
        if settings.JWT_SECRET_KEY in INSECURE_JWT_SECRETS:
            log.warning("SECURITY: JWT_SECRET_KEY is a default value — set a long random secret.")
        if settings.ADMIN_PASSWORD in INSECURE_ADMIN_PASSWORDS:
            log.warning("SECURITY: ADMIN_PASSWORD is a default/weak value — change it.")
        if "*" in settings.CORS_ORIGINS:
            log.warning("SECURITY: CORS_ORIGINS contains '*' — list your real frontend origins instead.")

        # Settle checkouts whose payment never completed (releases reserved stock and
        # catches payments that succeeded but were never confirmed by the browser).
        _sweep_stop.clear()
        threading.Thread(target=_reservation_sweep_loop, name="reservation-sweep", daemon=True).start()

    @app.on_event("shutdown")
    def _shutdown() -> None:
        _sweep_stop.set()

    # CORS — allow only the production frontend (plus any locally configured origins)
    allowed_origins = list(dict.fromkeys(
        [*settings.CORS_ORIGINS, "https://bhaktijyot-4ghf.vercel.app"]
    ))
    app.add_middleware(
        CORSMiddleware,
        allow_origins=allowed_origins,
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

