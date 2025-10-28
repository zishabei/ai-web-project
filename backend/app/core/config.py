from pydantic_settings import BaseSettings, SettingsConfigDict
class Settings(BaseSettings):
    OPENAI_API_KEY: str | None = None
    AZURE_OPENAI_ENDPOINT: str | None = None
    AZURE_OPENAI_API_KEY: str | None = None
    AZURE_OPENAI_DEPLOYMENT: str | None = None
    DATABASE_URL: str = "postgresql://dev:dev@localhost:5432/aiweb"
    REDIS_URL: str = "redis://localhost:6379/0"
    MILVUS_URI: str = "http://localhost:19530"
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8")
settings = Settings()
