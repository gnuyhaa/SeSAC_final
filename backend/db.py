import os
from sqlalchemy import create_engine
from dotenv import load_dotenv
from pathlib import Path

# .env 경로 지정 (backend 폴더 기준)
env_path = Path(__file__).parent / ".env"
load_dotenv(dotenv_path=env_path)

DB_USER = os.getenv("DB_USER")
DB_PASSWORD = os.getenv("DB_PASSWORD")
DB_HOST = os.getenv("DB_HOST")
DB_PORT = int(os.getenv("DB_PORT", 3306))  # 문자열 → int
DB_NAME = os.getenv("DB_NAME")
DB_CHARSET = os.getenv("DB_CHARSET", "utf8mb4")

# SQLAlchemy 엔진 생성
engine = create_engine(
    f"mysql+pymysql://{DB_USER}:{DB_PASSWORD}@{DB_HOST}:{DB_PORT}/{DB_NAME}?charset={DB_CHARSET}",
    echo=True,
    future=True
)
