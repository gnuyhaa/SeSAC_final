from fastapi import APIRouter, HTTPException
from sqlalchemy import text
from db import engine
from .recommend_category import recommend_category_by_mind
from .recommend_parks import recommend_parks_api  # 함수 그대로 import 가능
import traceback

router = APIRouter()

@router.post("/recommend_for_user")
def recommend_for_user(user_nickname: str, top_n_parks: int = 6, top_n_categories: int = 3):
    """
    사용자 최근 감정 기반으로
    1) 녹지 유형 추천(top_n_categories)
    2) 공원 추천(top_n_parks)
    결과 반환 및 DB 저장
    """
    try:
        with engine.begin() as conn:
            # 1. 최근 감정과 위치 가져오기
            query_emotion = text("""
                SELECT nickname, create_date, depression, anxiety, stress, happiness, achievement, energy, latitude, longitude
                FROM tb_users_emotions
                WHERE nickname = :nickname
                ORDER BY create_date DESC
                LIMIT 1
            """)
            row = conn.execute(query_emotion, {"nickname": user_nickname}).fetchone()
            if not row:
                raise HTTPException(status_code=404, detail="사용자 감정 정보가 없습니다.")
            
            emotions = {
                "우울": row.depression,
                "불안": row.anxiety,
                "스트레스": row.stress,
                "행복": row.happiness,
                "에너지": row.energy,
                "성취감": row.achievement
            }
            lat, lon = row.latitude, row.longitude

            # 2. 녹지 유형 추천
            recommended_categories = recommend_category_by_mind(emotions, top_n=top_n_categories)
            
            # DB 저장 - tb_user_recommended_categories
            insert_cat = text(f"""
                INSERT INTO tb_users_category_recommend
                (nickname, create_date, category_1, category_2, category_3)
                VALUES (:nickname, :create_date, :c1, :c2, :c3)
            """)
            # 카테고리 없으면 None 처리
            c = [rc["category"] for rc in recommended_categories] + [None]*3
            conn.execute(insert_cat, {
                "nickname": user_nickname,
                "create_date": row.create_date,
                "c1": c[0],
                "c2": c[1],
                "c3": c[2]
            })

            # 3. 공원 추천
            # recommend_parks_api 함수는 lat/lon/emotions/top_n 필요
            park_result = recommend_parks_api(lat=lat, lon=lon, emotions=emotions, top_n=top_n_parks)
            recommended_parks = park_result["recommended_parks"]

            # DB 저장 - tb_user_recommended_parks
            insert_parks = text(f"""
                INSERT INTO tb_users_parks_recommend
                (nickname, create_date, park_1, park_2, park_3, park_4, park_5, park_6)
                VALUES (:nickname, :create_date, :p1, :p2, :p3, :p4, :p5, :p6)
            """)
            p = [p.get("Name","") for p in recommended_parks] + [None]*6
            conn.execute(insert_parks, {
                "nickname": user_nickname,
                "create_date": row.create_date,
                "p1": p[0],
                "p2": p[1],
                "p3": p[2],
                "p4": p[3],
                "p5": p[4],
                "p6": p[5],
            })

        # 4. 결과 반환
        return {
            "recommended_categories": recommended_categories,
            "recommended_parks": recommended_parks
        }

    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"서버 오류: {str(e)}")
