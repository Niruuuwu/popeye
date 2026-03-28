from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from datetime import date
import sentry_sdk

from backend.dependencies.auth import get_current_user
from backend.services.supabase_client import supabase

router = APIRouter()


class WeightLogRequest(BaseModel):
    weight: float
    date: str


class WeightLogResponse(BaseModel):
    date: str
    weight: float


class WorkoutPlanRequest(BaseModel):
    content: str


@router.post("/weight", response_model=WeightLogResponse)
async def log_weight(request: WeightLogRequest, current_user: dict = Depends(get_current_user)):
    user_id = current_user["sub"]
    try:
        supabase.table("weight_logs").upsert({
            "user_id": user_id,
            "date": request.date,
            "weight": request.weight,
        }, on_conflict="user_id,date").execute()
        return WeightLogResponse(date=request.date, weight=request.weight)
    except Exception as e:
        sentry_sdk.set_user({"id": user_id})
        sentry_sdk.capture_exception(e)
        raise HTTPException(status_code=500, detail="Failed to save weight log")


@router.get("/weight")
async def get_weight_logs(current_user: dict = Depends(get_current_user)):
    user_id = current_user["sub"]
    try:
        result = (
            supabase.table("weight_logs")
            .select("date,weight")
            .eq("user_id", user_id)
            .order("date", desc=False)
            .limit(30)
            .execute()
        )
        return result.data
    except Exception as e:
        sentry_sdk.set_user({"id": user_id})
        sentry_sdk.capture_exception(e)
        raise HTTPException(status_code=500, detail="Failed to fetch weight logs")


@router.post("/workout")
async def save_workout_plan(request: WorkoutPlanRequest, current_user: dict = Depends(get_current_user)):
    user_id = current_user["sub"]
    try:
        supabase.table("workout_plans").insert({
            "user_id": user_id,
            "content": request.content,
        }).execute()
        return {"status": "saved"}
    except Exception as e:
        sentry_sdk.set_user({"id": user_id})
        sentry_sdk.capture_exception(e)
        raise HTTPException(status_code=500, detail="Failed to save workout plan")


@router.get("/workout")
async def get_latest_workout(current_user: dict = Depends(get_current_user)):
    user_id = current_user["sub"]
    try:
        result = (
            supabase.table("workout_plans")
            .select("content,saved_at")
            .eq("user_id", user_id)
            .order("saved_at", desc=True)
            .limit(1)
            .execute()
        )
        return result.data[0] if result.data else {}
    except Exception as e:
        sentry_sdk.set_user({"id": user_id})
        sentry_sdk.capture_exception(e)
        raise HTTPException(status_code=500, detail="Failed to fetch workout plan")
