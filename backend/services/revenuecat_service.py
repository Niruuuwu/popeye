import logging

import httpx

from backend.config import settings

logger = logging.getLogger(__name__)


async def check_entitlement(user_id: str) -> bool:
    """Check if a user has an active entitlement via RevenueCat REST API.

    Returns True if the user has any active entitlements.
    Fails open (returns True) on any error to avoid blocking users due to
    RevenueCat outages.
    """
    try:
        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"https://api.revenuecat.com/v1/subscribers/{user_id}",
                headers={"Authorization": f"Bearer {settings.REVENUECAT_SECRET_KEY}"},
            )
        if response.status_code == 200:
            entitlements = response.json()["subscriber"]["entitlements"]
            return bool(entitlements)
        logger.warning(
            "RevenueCat returned non-200 status %d for user %s; failing open",
            response.status_code,
            user_id,
        )
        return True
    except Exception as exc:
        logger.warning(
            "RevenueCat entitlement check failed for user %s: %s; failing open",
            user_id,
            exc,
        )
        return True
