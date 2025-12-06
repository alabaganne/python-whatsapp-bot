import logging
import os
import time
from collections.abc import AsyncGenerator, Callable
from contextlib import asynccontextmanager, suppress
from typing import Any

from fastapi import FastAPI, Request, Response
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from fastapi.responses import ORJSONResponse
from prometheus_client import CONTENT_TYPE_LATEST, Counter, Histogram, generate_latest

from app.auth.router import router as auth_router
from app.config import configure_logging, load_config
from app.scheduler import init_scheduler
from app.services.inbound_queue import spawn_workers, stop_workers
from app.utils.realtime import start_metrics_push_task, websocket_router
from app.views import router as webhook_router

# Define metrics at module level to prevent duplicate registration
REQUEST_COUNT = Counter("http_requests_total", "Total HTTP requests", ["method", "endpoint", "http_status"])
REQUEST_LATENCY = Histogram("http_request_duration_seconds", "HTTP request latency", ["method", "endpoint"])


def create_app() -> FastAPI:
    configure_logging()
    load_config()

    @asynccontextmanager
    async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
        pid = os.getpid()
        logging.info(f"startup: UI-only mode (no database, scheduler, or workers) in pid {pid}")
        # Database initialization disabled for UI-only mode
        # from app.db import init_models
        # init_models()

        # Scheduler disabled for UI-only mode
        # logging.info(f"startup: initializing scheduler in pid {pid}")
        # init_scheduler(app)

        # Inbound queue workers disabled for UI-only mode
        # try:
        #     num_workers = int(os.environ.get("INBOUND_QUEUE_WORKERS", "2"))
        # except Exception:
        #     num_workers = 2
        # stop_event, tasks = spawn_workers(max(1, num_workers))
        # app.state.inbound_queue_stop_event = stop_event
        # app.state.inbound_queue_tasks = tasks

        yield
        # Shutdown: close HTTP clients
        logging.info("shutdown: closing HTTP clients")
        from app.utils.http_client import async_client, sync_client

        await async_client.aclose()
        sync_client.close()

        # Stop inbound queue workers - disabled for UI-only mode
        # with suppress(Exception):
        #     await stop_workers(app.state.inbound_queue_stop_event, app.state.inbound_queue_tasks)

    app = FastAPI(default_response_class=ORJSONResponse, lifespan=lifespan)

    # Configure CORS
    # In development, allow all origins from local network for testing on mobile/other devices
    # In production, restrict to specific origins
    dev_mode = os.getenv("ENVIRONMENT", "development") == "development"

    if dev_mode:
        # Allow all origins in development for network testing
        origins = ["*"]
        allow_origin_regex = r"^http://(localhost|127\.0\.0\.1|192\.168\.\d+\.\d+|172\.\d+\.\d+\.\d+)(:\d+)?$"
    else:
        origins = [
            "http://localhost",
            "http://localhost:8080",
            "http://127.0.0.1:8080",
            "http://localhost:3831",
            "http://127.0.0.1:3831",
            "http://localhost:16532",
            "http://127.0.0.1:16532",
            "http://localhost:3000",
            "http://127.0.0.1:3000",
            "null",
        ]

        # Add production frontend origin from environment if set
        production_frontend = os.getenv("APP_URL")
        if production_frontend:
            production_frontend = production_frontend.rstrip("/")
            if production_frontend not in origins:
                origins.append(production_frontend)

        allow_origin_regex = None

    app.add_middleware(
        CORSMiddleware,
        allow_origins=origins,
        allow_origin_regex=allow_origin_regex,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    # Add GZip compression for large JSON payloads (documents, etc.)
    # Responses > 500 bytes will be compressed (reduces 141KB documents significantly)
    app.add_middleware(GZipMiddleware, minimum_size=500)

    @app.middleware("http")
    async def metrics_middleware(request: Request, call_next: Callable[[Request], Any]):
        start_time = time.time()
        response = await call_next(request)
        elapsed = time.time() - start_time
        try:
            # Safely handle URL paths that might cause parsing errors
            path = str(request.url.path)
            # Normalize the path to avoid issues with invalid characters
            if "[" in path or "]" in path:
                # Replace problematic IPv6 URL characters or sanitize path
                path = "/__sanitized_path__"

            REQUEST_LATENCY.labels(request.method, path).observe(elapsed)
            REQUEST_COUNT.labels(request.method, path, response.status_code).inc()
        except Exception as e:
            logging.warning(f"Metrics instrumentation failed: {e}")
        return response

    @app.get("/metrics")
    async def metrics() -> Response:
        return Response(generate_latest(), media_type=CONTENT_TYPE_LATEST)

    # Include HTTP routers
    app.include_router(webhook_router)
    app.include_router(auth_router)
    # Include config router
    from app.services.domain.config.config_router import router as config_router

    app.include_router(config_router)
    # Include WebSocket router
    app.include_router(websocket_router)

    # Start background metrics push to websocket clients
    start_metrics_push_task(app)
    return app
