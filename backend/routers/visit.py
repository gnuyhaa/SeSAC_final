from fastapi import APIRouter, HTTPException
from sqlalchemy import text
from db import engine  
from datetime import datetime, timedelta, timezone
import traceback

router = APIRouter()
KST = timezone(timedelta(hours=9))  # 한국 표준시

# -----------------------------
# 토글 상태 변경 API
# -----------------------------
@router.post("/toggle_visit_status")
def toggle_visit_status(nickname: str, park_id: int):
    """
    공원 방문 시 tb_parks_visit_log에 기록하고,
    tb_users_parks_status의 visit_count를 갱신합니다.
    """
    try:
        now_kst = datetime.now(KST)

        with engine.begin() as conn:
            # 1. 방문 로그 INSERT
            conn.execute(text("""
                INSERT INTO tb_parks_visit_log (nickname, park_id, visit_date)
                VALUES (:nickname, :park_id, :visit_date)
            """), {"nickname": nickname, "park_id": park_id, "visit_date": now_kst})

            # 2. 누적 방문 횟수 갱신
            # tb_parks_visit_log 기준으로 COUNT
            result = conn.execute(text("""
                SELECT nickname, park_id, COUNT(*) AS visit_count
                FROM tb_parks_visit_log
                WHERE nickname = :nickname AND park_id = :park_id
                GROUP BY nickname, park_id
            """), {"nickname": nickname, "park_id": park_id}).mappings().first()

            # tb_users_parks_status 갱신
            conn.execute(text("""
                INSERT INTO tb_users_parks_status (nickname, park_id, visit_count)
                VALUES (:nickname, :park_id, :visit_count)
                ON DUPLICATE KEY UPDATE visit_count = :visit_count
            """), result)

        print(f"[{now_kst.strftime('%Y-%m-%d %H:%M:%S')}] TOGGLE_VISIT:")
        print(f"  nickname={nickname}, park_id={park_id}, new_visit_count={result['visit_count']}")
        
        return {"status": "success", "visit_count": result["visit_count"]}

    except Exception as e:
        print(f"[{datetime.now(KST).strftime('%Y-%m-%d %H:%M:%S')}] TOGGLE_VISIT ERROR:", str(e))
        traceback.print_exc()
        raise HTTPException(status_code=500, detail="DB error while toggling visit status")


# -----------------------------
# 마이페이지용 – 사용자 방문 상태 조회
# -----------------------------
@router.get("/get_user_visits")
def get_user_visits(nickname: str):
    try:
        with engine.connect() as conn:
            result = conn.execute(text("""
                SELECT p.ID AS park_id, p.Park AS park_name, p.Address AS address,
                       IFNULL(s.visit_count, 0) AS visit_count
                FROM tb_parks p
                LEFT JOIN tb_users_parks_status s
                  ON p.ID = s.park_id AND s.nickname = :nickname
            """), {"nickname": nickname}).mappings().all()
        print(f"[{datetime.now(KST).strftime('%Y-%m-%d %H:%M:%S')}] GET_USER_VISITS: nickname={nickname}, parks_count={len(result)}")

        return {"parks": result}

    except Exception as e:
        print(f"[{datetime.now(KST).strftime('%Y-%m-%d %H:%M:%S')}] GET_USER_VISITS ERROR:", str(e))
        traceback.print_exc()
        raise HTTPException(status_code=500, detail="DB error while fetching visits")


# -----------------------------
# 지도용 – 구별 방문 횟수 조회
# -----------------------------
@router.get("/get_district_heatmap")
def get_district_heatmap():
    try:
        now_kst = datetime.now(KST)
        with engine.connect() as conn:
            result = conn.execute(text("""
                SELECT 
                    SUBSTRING_INDEX(SUBSTRING_INDEX(p.Address, ' ', 2), ' ', -1) AS district_name,
                    COUNT(*) AS visit_count
                FROM tb_parks_visit_log v
                JOIN tb_parks p ON v.park_id = p.ID
                GROUP BY district_name
            """)).mappings().all()

        print(f"[{now_kst.strftime('%Y-%m-%d %H:%M:%S')}] GET_DISTRICT_HEATMAP: districts_count={len(result)}")

        return {"districts": result}

    except Exception as e:
        print(f"[{datetime.now(KST).strftime('%Y-%m-%d %H:%M:%S')}] GET_DISTRICT_HEATMAP ERROR:", str(e))
        traceback.print_exc()
        raise HTTPException(status_code=500, detail="DB error while fetching heatmap")
