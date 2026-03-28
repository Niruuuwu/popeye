import logging

from fastapi import Depends, HTTPException
from fastapi.security import OAuth2PasswordBearer

from backend.services.supabase_client import supabase

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login")
logger = logging.getLogger(__name__)


async def get_current_user(token: str = Depends(oauth2_scheme)) -> dict:
    if not token:
        raise HTTPException(status_code=401, detail="Invalid token")
    try:
        user = supabase.auth.get_user(token)
        if not user or not user.user:
            raise HTTPException(status_code=401, detail="Invalid token")
        return {"sub": str(user.user.id), "email": user.user.email}
    except Exception as e:
        logger.error(f"Auth failed: {e}")
        raise HTTPException(status_code=401, detail="Invalid token")
