import logging

import sentry_sdk
from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
from sentry_sdk.integrations.fastapi import FastApiIntegration

from backend.config import settings
from backend.routers.auth import router as auth_router
from backend.routers.chat import router as chat_router
from backend.routers.health import router as health_router
from backend.routers.weight import router as weight_router

logger = logging.getLogger(__name__)

if settings.SENTRY_DSN:
    sentry_sdk.init(
        dsn=settings.SENTRY_DSN,
        traces_sample_rate=settings.SENTRY_TRACES_SAMPLE_RATE,
        integrations=[FastApiIntegration()],
    )
else:
    logger.warning("WARNING: SENTRY_DSN not set, error reporting disabled")

app = FastAPI(title="expo-chatbot-app backend")

app.include_router(health_router)
app.include_router(auth_router, prefix="/auth")
app.include_router(chat_router)
app.include_router(weight_router)


@app.middleware("http")
async def sentry_user_middleware(request: Request, call_next):
    """Attach authenticated user ID to every Sentry event."""
    auth_header = request.headers.get("Authorization", "")
    if auth_header.startswith("Bearer "):
        try:
            from backend.services.supabase_client import supabase
            token = auth_header.split(" ", 1)[1]
            user = supabase.auth.get_user(token)
            if user and user.user:
                sentry_sdk.set_user({
                    "id": str(user.user.id),
                    "email": user.user.email,
                })
        except Exception:
            pass
    response = await call_next(request)
    return response


@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    sentry_sdk.capture_exception(exc)
    return JSONResponse(status_code=500, content={"detail": "Internal server error"})
