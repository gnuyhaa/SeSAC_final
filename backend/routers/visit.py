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
    공원 방문 시: 로그 추가(tb_parks_visit_log에 기록) + 상태 테이블 업데이트(tb_users_parks_status)
    방문 해제 시: 상태 해제 (is_visited=0)
    """
    try:
        now_dt = datetime.now(KST)
        now_str = now_dt.strftime("%Y-%m-%d %H:%M:%S")
        
        with engine.begin() as conn:
            # 현재 상태 조회
            status = conn.execute(text("""
                SELECT is_visited FROM tb_users_parks_status
                WHERE nickname = :nickname AND park_id = :park_id
            """), {"nickname": nickname, "park_id": park_id}).mappings().fetchone()

            if status and status["is_visited"] == 1:
                # 방문 해제
                conn.execute(text("""
                    UPDATE tb_users_parks_status
                    SET is_visited = 0, updated_at = :updated_at
                    WHERE nickname = :nickname AND park_id = :park_id
                """), {"nickname": nickname, "park_id": park_id, "updated_at": now_str})

                action = "unvisited"
                print(f"[{now_str}] UNVISIT: nickname={nickname}, park_id={park_id}")

            else:
                # 방문 등록
                conn.execute(text("""
                    INSERT INTO tb_parks_visit_log (nickname, park_id, visit_date)
                    VALUES (:nickname, :park_id, :visit_date)
                """), {"nickname": nickname, "park_id": park_id, "visit_date": now_str})

                # 상태 테이블 갱신 (없으면 insert)
                conn.execute(text("""
                    INSERT INTO tb_users_parks_status (nickname, park_id, is_visited, visit_date, updated_at)
                    VALUES (:nickname, :park_id, 1, :visit_date, :updated_at)
                    ON DUPLICATE KEY UPDATE
                        is_visited = 1,
                        visit_date = :visit_date,
                        updated_at = :updated_at
                """), {
                    "nickname": nickname,
                    "park_id": park_id,
                    "visit_date": now_str,
                    "updated_at": now_str
                })

                action = "visited"
                print(f"[{now_str}] VISIT: nickname={nickname}, park_id={park_id}")

            # 방문 횟수 계산
            visit_count = conn.execute(text("""
                SELECT COUNT(*) FROM tb_parks_visit_log
                WHERE nickname = :nickname AND park_id = :park_id
            """), {"nickname": nickname, "park_id": park_id}).scalar()

            conn.execute(text("""
                UPDATE tb_users_parks_status
                SET visit_count = :visit_count
                WHERE nickname = :nickname AND park_id = :park_id
            """), {"visit_count": visit_count, "nickname": nickname, "park_id": park_id})

        return {"status": "success", "action": action, "visit_count": visit_count}

    except Exception as e:
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
                    IFNULL(s.visit_count, 0) AS visit_count,
                    IFNULL(s.is_visited, 0) AS is_visited,
                    s.visit_date
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
