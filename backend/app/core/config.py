from pydantic_settings import BaseSettings, SettingsConfigDict
class Settings(BaseSettings):
    OPENAI_API_KEY: str | None = None
    AZURE_OPENAI_ENDPOINT: str | None = None
    AZURE_OPENAI_API_KEY: str | None = None
    AZURE_OPENAI_DEPLOYMENT: str | None = None
    OPENAI_VECTOR_STORE_ID: str | None = None
    DATABASE_URL: str = "postgresql://dev:dev@localhost:5432/aiweb"
    REDIS_URL: str = "redis://localhost:6379/0"
    MILVUS_URI: str = "http://localhost:19530"
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",  # 忽略 .env 中未声明的其它变量
    )
settings = Settings()
