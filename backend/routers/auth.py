from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from supabase_auth.errors import AuthApiError

from backend.models.auth import AuthResponse, LoginRequest, SignupRequest
from backend.services.supabase_client import supabase

router = APIRouter()


@router.post("/signup", response_model=AuthResponse)
async def signup(request: SignupRequest):
    try:
        result = supabase.auth.sign_up({"email": request.email, "password": request.password})
        if result.session is None:
            # Email confirmation required — return empty tokens as signal
            return AuthResponse(
                access_token="",
                refresh_token="",
                user_id=str(result.user.id) if result.user else "",
            )
        return AuthResponse(
            access_token=result.session.access_token,
            refresh_token=result.session.refresh_token or "",
            user_id=str(result.user.id),
        )
    except AuthApiError as e:
        raise HTTPException(status_code=400, detail=str(e.message))


@router.post("/login", response_model=AuthResponse)
async def login(request: LoginRequest):
    try:
        result = supabase.auth.sign_in_with_password({"email": request.email, "password": request.password})
        return AuthResponse(
            access_token=result.session.access_token,
            refresh_token=result.session.refresh_token or "",
            user_id=str(result.user.id),
        )
    except AuthApiError as e:
        raise HTTPException(status_code=400, detail=str(e.message))


class RefreshRequest(BaseModel):
    refresh_token: str


@router.post("/refresh", response_model=AuthResponse)
async def refresh(request: RefreshRequest):
    try:
        result = supabase.auth.refresh_session(request.refresh_token)
        return AuthResponse(
            access_token=result.session.access_token,
            refresh_token=result.session.refresh_token or "",
            user_id=str(result.user.id),
        )
    except AuthApiError as e:
        raise HTTPException(status_code=401, detail=str(e.message))
