from functools import lru_cache

from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""

    # Database
    DATABASE_URL: str = "postgresql+asyncpg://postgres:postgres@localhost:5432/emenus"

    # Groq AI
    GROQ_API_KEY: str = ""
    GROQ_MODEL: str = "llama-3.1-70b-versatile"
    GROQ_TIMEOUT: int = 30
    GROQ_MAX_RETRIES: int = 2

    # Notifications
    WHATSAPP_API_URL: str = ""
    WHATSAPP_API_TOKEN: str = ""
    EMAIL_SMTP_HOST: str = "localhost"
    EMAIL_SMTP_PORT: int = 587
    EMAIL_FROM: str = "noreply@emenutables.com"
    EMAIL_USERNAME: str = ""
    EMAIL_PASSWORD: str = ""

    # App
    APP_NAME: str = "eMenu Tables - Smart Tagging"
    DEBUG: bool = False

    model_config = {"env_file": ".env", "env_file_encoding": "utf-8"}


@lru_cache
def get_settings() -> Settings:
    return Settings()
