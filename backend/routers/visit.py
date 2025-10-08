from fastapi import APIRouter, HTTPException
from sqlalchemy import text
from db import engine  
from datetime import datetime

router = APIRouter()

# 토글 상태 변경 API
@router.post("/toggle_visit_status")
def toggle_visit_status(nickname: str, park_id: int, is_visited: bool):
    try:
        with engine.begin() as conn:
            # 1. 현재 상태 테이블 갱신
            conn.execute(text("""
                INSERT INTO tb_users_parks_status (nickname, park_id, is_visited)
                VALUES (:nickname, :park_id, :is_visited)
                ON DUPLICATE KEY UPDATE
                    is_visited = :is_visited,
                    updated_at = NOW()
            """), {"nickname": nickname, "park_id": park_id, "is_visited": is_visited})

            # 2. 방문 기록은 ON일 때만 추가
            if is_visited:
                conn.execute(text("""
                    INSERT INTO tb_parks_visit_log (nickname, park_id, visit_date)
                    VALUES (:nickname, :park_id, NOW())
                """), {"nickname": nickname, "park_id": park_id})

        return {"status": "success", "is_visited": is_visited}

    except Exception as e:
        print("toggle_visit_status 에러:", e)
        raise HTTPException(status_code=500, detail="DB error while toggling visit status")


# 마이페이지용 – 사용자 방문 상태 조회
@router.get("/get_user_visits")
def get_user_visits(nickname: str):
    try:
        with engine.connect() as conn:
            result = conn.execute(text("""
                SELECT 
                    p.ID AS park_id, 
                    p.Park AS park_name, 
                    p.Address AS address, 
                    IFNULL(s.is_visited, 0) AS is_visited
                FROM tb_parks p
                LEFT JOIN tb_users_parks_status s
                ON p.ID = s.park_id AND s.nickname = :nickname
            """), {"nickname": nickname}).mappings().all()

        return {"parks": result}

    except Exception as e:
        print("get_user_visits 에러:", e)
        raise HTTPException(status_code=500, detail="DB error while fetching visits")


# 지도용 – 구별 방문 횟수 조회
@router.get("/get_district_heatmap")
def get_district_heatmap():
    try:
        with engine.connect() as conn:
            result = conn.execute(text("""
                SELECT 
                    SUBSTRING_INDEX(SUBSTRING_INDEX(p.Address, ' ', 2), ' ', -1) AS district_name,
                    COUNT(*) AS visit_count
                FROM tb_parks_visit_log v
                JOIN tb_parks p ON v.park_id = p.ID
                GROUP BY district_name
            """)).mappings().all()

        return {"districts": result}

    except Exception as e:
        print("get_district_heatmap 에러:", e)
        raise HTTPException(status_code=500, detail="DB error while fetching heatmap")
