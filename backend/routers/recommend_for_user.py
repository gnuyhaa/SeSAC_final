from fastapi import APIRouter, HTTPException
from sqlalchemy import text
from ..db import engine
from algorithm.parks_algorithm import recommend_from_scored_parks
from algorithm.category_algorithm import recommend_category_by_mind
import traceback

router = APIRouter()

@router.post("/recommend_for_user")
def recommend_for_user(user_nickname: str, top_n_parks: int = 6, top_n_categories: int = 3):
    """
    사용자 최근 감정 기반으로
    1) 녹지 유형 추천(top_n_categories, Content 포함)
    2) 공원 추천(top_n_parks)
    결과 반환 및 DB 저장
    로그는 그대로 출력
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
            print(f"[{user_nickname}] 최신 감정:", emotions, "위치:", (lat, lon))

            # 2. 녹지 유형 추천
            recommended_categories = recommend_category_by_mind(emotions, top_n=top_n_categories)
            print(f"[{user_nickname}] 추천 녹지 유형 (이름만):", recommended_categories)

            # Content 포함해서 DB와 반환용으로 가져오기
            cat_with_content = []
            for rc in recommended_categories:
                cat_name = rc["category"]
                # DB에서 Content 가져오기
                result = conn.execute(text("""
                    SELECT Content
                    FROM tb_parks_categorys
                    WHERE Category = :category
                """), {"category": cat_name}).fetchone()
                sentences = [s.strip() for s in result.Content.split("/") if s.strip()] if result else []
                cat_with_content.append({
                    "category": cat_name,
                    "content": sentences
                })
            print(f"[{user_nickname}] 추천 녹지 유형 + Content:", cat_with_content)

            # DB 저장 - tb_users_category_recommend
            insert_cat = text("""
                INSERT INTO tb_users_category_recommend
                (nickname, create_date, category_1, category_2, category_3)
                VALUES (:nickname, :create_date, :c1, :c2, :c3)
            """)
            c = [rc["category"] for rc in recommended_categories] + [None]*3
            conn.execute(insert_cat, {
                "nickname": user_nickname,
                "create_date": row.create_date,
                "c1": c[0],
                "c2": c[1],
                "c3": c[2]
            })
            print(f"{user_nickname} 저장된 녹지 유형:", c[:top_n_categories])

            # 3. 공원 추천
            recommended_parks = recommend_from_scored_parks(lat, lon, emotions, top_n=top_n_parks)            
            p = [p.get("Park", "") for p in recommended_parks] + [None]*6 
            print(f"[{user_nickname}] 추천 공원:", [park.get("Park", "") for park in recommended_parks])

            # DB 저장 - tb_users_parks_recommend
            insert_parks = text("""
                INSERT INTO tb_users_parks_recommend
                (nickname, create_date, park_1, park_2, park_3, park_4, park_5, park_6)
                VALUES (:nickname, :create_date, :p1, :p2, :p3, :p4, :p5, :p6)
            """)
            conn.execute(insert_parks, {
                "nickname": user_nickname,
                "create_date": row._mapping["create_date"],
                "p1": p[0],
                "p2": p[1],
                "p3": p[2],
                "p4": p[3],
                "p5": p[4],
                "p6": p[5],
            })

        # 4. 결과 반환
        return {
            "recommended_categories": cat_with_content,
            "recommended_parks": recommended_parks
        }

    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"서버 오류: {str(e)}")


@router.get("/latest_recommendation/{user_nickname}")
def get_latest_recommendation(user_nickname: str):
    try:
        with engine.begin() as conn:
            # 최신 감정 데이터
            emotion_rows = conn.execute(text("""
                SELECT create_date, depression, anxiety, stress, happiness, achievement, energy
                FROM tb_users_emotions
                WHERE nickname = :nickname
                ORDER BY create_date DESC
            """), {"nickname": user_nickname}).fetchall()

            # 최신 녹지 유형
            cat_rows = conn.execute(text("""
                SELECT create_date, category_1, category_2, category_3
                FROM tb_users_category_recommend
                WHERE nickname = :nickname
                ORDER BY create_date DESC
            """), {"nickname": user_nickname}).fetchall()

            # 최신 추천 공원
            park_rows = conn.execute(text("""
                SELECT create_date, park_1, park_2, park_3, park_4, park_5, park_6
                FROM tb_users_parks_recommend
                WHERE nickname = :nickname
                ORDER BY create_date DESC
            """), {"nickname": user_nickname}).fetchall()

            print(f"[{user_nickname}] 최신 감정 데이터:", [dict(r._mapping) for r in emotion_rows])
            print(f"[{user_nickname}] 최신 녹지 유형:", [[c for c in r._mapping.values() if c] for r in cat_rows])
            print(f"[{user_nickname}] 최신 추천 공원:", [[p for p in r._mapping.values() if p] for r in park_rows])

        return {
            "latest_emotions": [dict(row._mapping) for row in emotion_rows] if emotion_rows else [],
            "recommended_categories": [
                [cat for cat in row._mapping.values() if cat] for row in cat_rows
            ] if cat_rows else [],
            "recommended_parks": [
                [park for park in row._mapping.values() if park] for row in park_rows
            ] if park_rows else []
        }

    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"서버 오류: {str(e)}")
