import os

# Set required env vars before any backend imports so pydantic-settings can
# instantiate Settings() without a real .env file.
os.environ.setdefault("SUPABASE_URL", "https://test.supabase.co")
os.environ.setdefault("SUPABASE_ANON_KEY", "test-anon-key")
os.environ.setdefault("SUPABASE_JWT_SECRET", "test-jwt-secret")
os.environ.setdefault("GEMINI_API_KEY", "test-gemini-key")
os.environ.setdefault("SENTRY_DSN", "")
os.environ.setdefault("REVENUECAT_SECRET_KEY", "test-rc-key")
os.environ.setdefault("NGROK_AUTHTOKEN", "test-ngrok-token")

import pytest

# Shared fixtures will be added here as features are implemented.
# Examples: mocked Supabase client, mocked Gemini client, test JWT tokens.
