# 녹지 유형 api
from fastapi import APIRouter, HTTPException
from sqlalchemy import text
from db import engine

router = APIRouter()

@router.get("/park_categories")
def get_park_categories():
    try:
        with engine.connect() as conn:
            result = conn.execute(
                text("SELECT ID, Category, Content FROM tb_parks_categorys")
            )
            rows = []
            for row in result:
                # / 기준으로 문장 나누기
                sentences = [s.strip() for s in row.Content.split("/") if s.strip()]
                rows.append({
                    # "id": row.ID,
                    "category": row.Category,
                    "content": sentences  # 리스트로 내려줌
                })
        return rows
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))