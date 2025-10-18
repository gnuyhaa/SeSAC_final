from fastapi import APIRouter, HTTPException
from sqlalchemy import text
from ..db import engine  
from datetime import datetime, timedelta, timezone
import traceback

router = APIRouter()
KST = timezone(timedelta(hours=9))  # 한국 표준시

# -----------------------------
# 토글 상태 변경 API
# -----------------------------
@router.post("/toggle_visit_status")
def toggle_visit_status(nickname: str, park_id: int, create_date: str):
    """
    같은 처방(create_date)에서 같은 공원(park_id)을 다시 누르면 토글 OFF.
    그렇지 않으면 새 방문으로 ON.
    """
    try:
        with engine.begin() as conn:
            # 같은 처방에서 이미 클릭한 기록이 있는지 확인
            existing = conn.execute(text("""
                SELECT id FROM tb_parks_visit_log
                WHERE nickname = :nickname 
                  AND park_id = :park_id 
                  AND create_date = :create_date
            """), {
                "nickname": nickname,
                "park_id": park_id,
                "create_date": create_date
            }).mappings().first()

            if existing:
                # 이미 존재하면 OFF (삭제)
                conn.execute(text("""
                    DELETE FROM tb_parks_visit_log
                    WHERE id = :id
                """), {"id": existing["id"]})

                # 상태 OFF로 변경
                conn.execute(text("""
                    UPDATE tb_users_parks_status
                    SET is_visited = 0,
                        visit_count = GREATEST(visit_count - 1, 0)
                    WHERE nickname = :nickname AND park_id = :park_id
                """), {
                    "nickname": nickname,
                    "park_id": park_id
                })

                action = "off"

            else:
                # 없으면 ON (새 방문 추가)
                conn.execute(text("""
                    INSERT INTO tb_parks_visit_log (nickname, park_id, create_date, visit_date)
                    VALUES (:nickname, :park_id, :create_date, NOW())
                """), {
                    "nickname": nickname,
                    "park_id": park_id,
                    "create_date": create_date
                })

                # park_id별 누적 방문 횟수 다시 계산
                visit_count = conn.execute(text("""
                    SELECT COUNT(*) FROM tb_parks_visit_log
                    WHERE nickname = :nickname AND park_id = :park_id
                """), {
                    "nickname": nickname,
                    "park_id": park_id
                }).scalar()

                # 상태 테이블 갱신
                conn.execute(text("""
                    INSERT INTO tb_users_parks_status (nickname, park_id, is_visited, visit_count, visit_date)
                    VALUES (:nickname, :park_id, 1, :visit_count, NOW())
                    ON DUPLICATE KEY UPDATE
                        is_visited = 1,
                        visit_count = :visit_count,
                        visit_date = NOW()
                """), {
                    "nickname": nickname,
                    "park_id": park_id,
                    "visit_count": visit_count
                })

                action = "on"

        return {"status": "success", "action": action}

    except Exception:
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
                        SELECT 
                            p.ID AS park_id,
                            p.Park AS park_name,
                            p.Address AS address,
                            COALESCE(v.visit_count, 0) AS visit_count,
                            CASE WHEN v.visit_count > 0 THEN 1 ELSE 0 END AS is_visited,
                            r.create_date AS recommend_date
                        FROM tb_users_parks_recommend r
                        JOIN tb_parks p
                            ON JSON_CONTAINS(
                                JSON_ARRAY(r.park_1,r.park_2,r.park_3,r.park_4,r.park_5,r.park_6),
                                JSON_QUOTE(p.Park)
                            )
                        LEFT JOIN (
                            SELECT 
                                park_id,
                                create_date,
                                COUNT(*) AS visit_count
                            FROM tb_parks_visit_log
                            WHERE nickname = :nickname
                            GROUP BY park_id, create_date
                        ) v ON v.park_id = p.ID AND v.create_date = r.create_date
                        WHERE r.nickname = :nickname
                        ORDER BY r.create_date DESC, p.Park ASC
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
def get_district_heatmap(nickname: str):
    """
    각 구별 (총 방문횟수 / 전체 공원 수) 비율 계산
    weighted_ratio = Σ(visit_count) / total_parks
    """
    try:
        now_kst = datetime.now(KST)
        with engine.connect() as conn:
            result = conn.execute(text("""
                SELECT 
                    p.Address,
                    SUBSTRING_INDEX(SUBSTRING_INDEX(p.Address, ' ', 2), ' ', -1) AS district_name,
                    SUM(s.visit_count) AS total_visits,
                    COUNT(DISTINCT s.park_id) AS visited_parks,
                    (SELECT COUNT(*) FROM tb_parks WHERE SUBSTRING_INDEX(SUBSTRING_INDEX(Address, ' ', 2), ' ', -1) = district_name) AS total_parks
                FROM tb_users_parks_status s
                JOIN tb_parks p ON s.park_id = p.ID
                WHERE s.nickname = :nickname AND s.is_visited = 1
                GROUP BY district_name
            """), {"nickname": nickname}).mappings().all()
            
            # weighted_ratio 추가 계산
            districts = []
            for row in result:
                weighted_ratio = row["total_visits"] / row["total_parks"] if row["total_parks"] else 0
                districts.append({
                    "district_name": row["district_name"],
                    "visit_count": row["total_visits"],
                    "weighted_ratio": weighted_ratio
                })

        print(f"[{now_kst.strftime('%Y-%m-%d %H:%M:%S')}] GET_DISTRICT_HEATMAP: districts_count={len(districts)}")

        return {"districts": districts}

    except Exception as e:
        print(f"[{datetime.now(KST).strftime('%Y-%m-%d %H:%M:%S')}] GET_DISTRICT_HEATMAP ERROR:", str(e))
        traceback.print_exc()
        raise HTTPException(status_code=500, detail="DB error while fetching heatmap")
