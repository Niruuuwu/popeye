import asyncio
import logging
from datetime import datetime, timezone

import sentry_sdk
from fastapi import APIRouter, Depends, HTTPException

from backend.dependencies.auth import get_current_user
from backend.models.chat import ChatRequest, ChatResponse
from backend.services.gemini_service import generate_response
from backend.services.revenuecat_service import check_entitlement
from backend.services.supabase_client import supabase

router = APIRouter()
logger = logging.getLogger(__name__)
FREE_DAILY_LIMIT = 20


@router.post("/chat", response_model=ChatResponse)
async def chat(
    request: ChatRequest,
    current_user: dict = Depends(get_current_user),
):
    user_id = current_user["sub"]

    # Check RevenueCat entitlement
    is_premium = await check_entitlement(user_id)
    logger.info("RevenueCat check for user %s: is_premium=%s", user_id, is_premium)

    # NOTE: Message limit disabled — RevenueCat user ID sync pending native build
    # In production, re-enable after configuring Purchases.logIn(supabaseUserId)
    # if not is_premium:
    #     ... limit check ...

    conversation_id = request.conversation_id

    # Create a new conversation if none provided
    if conversation_id is None:
        result = supabase.table("conversations").insert({"user_id": user_id}).execute()
        conversation_id = result.data[0]["id"]

    # Fetch message history
    result = (
        supabase.table("messages")
        .select("role,content")
        .eq("conversation_id", conversation_id)
        .order("created_at", desc=False)
        .execute()
    )
    history = [{"role": row["role"], "parts": [row["content"]]} for row in result.data]

    # Call AI
    try:
        ai_response = await generate_response(history, request.message)
    except asyncio.TimeoutError:
        raise HTTPException(status_code=503, detail="AI service timed out")
    except Exception:
        raise HTTPException(status_code=503, detail="AI service unavailable")

    # Persist messages
    try:
        supabase.table("messages").insert({
            "conversation_id": conversation_id,
            "user_id": user_id,
            "role": "user",
            "content": request.message,
        }).execute()
        supabase.table("messages").insert({
            "conversation_id": conversation_id,
            "user_id": user_id,
            "role": "model",
            "content": ai_response,
        }).execute()
    except Exception as e:
        sentry_sdk.set_user({"id": user_id})
        sentry_sdk.capture_exception(e)
        raise HTTPException(status_code=500, detail="Failed to persist message")

    return ChatResponse(response=ai_response, conversation_id=conversation_id)
