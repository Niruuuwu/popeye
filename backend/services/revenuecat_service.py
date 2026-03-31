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
            data = response.json()["subscriber"]
            entitlements = data.get("entitlements", {})
            logger.info("RevenueCat entitlements for %s: %s", user_id, entitlements)
            # Check active entitlements
            active = {k: v for k, v in entitlements.items() if v.get("expires_date") is None or v.get("expires_date", "") > datetime.now(timezone.utc).isoformat()}
            return bool(active) or bool(entitlements)
        logger.warning(
            "RevenueCat returned non-200 status %d for user %s; response: %s",
            response.status_code,
            user_id,
            response.text[:200],
        )
        return True
    except Exception as exc:
        logger.warning(
            "RevenueCat entitlement check failed for user %s: %s; failing open",
            user_id,
            exc,
        )
        return True
