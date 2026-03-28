from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env", env_file_encoding="utf-8", extra="ignore"
    )

    SUPABASE_URL: str
    SUPABASE_ANON_KEY: str
    SUPABASE_SERVICE_ROLE_KEY: str = ""
    SUPABASE_JWT_SECRET: str = ""
    GEMINI_API_KEY: str = ""
    GROQ_API_KEY: str = ""
    SENTRY_DSN: str = ""
    SENTRY_TRACES_SAMPLE_RATE: float = 1.0
    REVENUECAT_SECRET_KEY: str = ""
    NGROK_AUTHTOKEN: str = ""


settings = Settings()
