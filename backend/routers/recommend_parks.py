# 공원 추천 api
from fastapi import APIRouter, Body, HTTPException
from typing import Dict
from algorithm.parks_algorithm import recommend_from_scored_parks
from sqlalchemy import text
from ..db import engine
import traceback

router = APIRouter()

@router.post("/recommend_parks")
def recommend_parks_api(
    lat: float = Body(..., description="사용자 위도"),
    lon: float = Body(..., description="사용자 경도"),
    emotions: Dict[str, int] = Body(..., description="감정 수준 예: {'우울':5,'불안':5}"),
    top_n: int = Body(6, description="추천 상위 N개")
):
    try:
        with engine.begin() as conn:
            # 반경 5km 공원 조회
            query_parks = text("""
                SELECT ID, Park, Latitude, Longitude
                FROM tb_parks
                WHERE (
                    6371 * 2 * ASIN(
                        SQRT(
                            POWER(SIN(RADIANS((:lat - latitude) / 2)), 2) +
                            COS(RADIANS(:lat)) * COS(RADIANS(latitude)) *
                            POWER(SIN(RADIANS((:lon - longitude) / 2)), 2)
                        )
                    )
                ) <= 5;
            """)
            parks_list = conn.execute(query_parks, {"lat": lat, "lon": lon}).fetchall()
            print("parks_list 길이:", len(parks_list)) ### 

            if not parks_list:
                return {
                    "recommended_parks": [], 
                    "message": "반경 5km 내 공원이 없습니다."}

            # 공원 ID 목록 추출
            park_ids = [p.ID for p in parks_list]

            # 한 번에 점수 데이터 조회 (IN 절)
            query_scores = text(f"""
                SELECT * FROM tb_parks_score
                WHERE ParkID IN :park_ids
            """)
            rows = conn.execute(query_scores, {"park_ids": tuple(park_ids)}).fetchall()

            # ParkID 기준으로 공원 기본정보 매핑
            park_info = {p.ID: p for p in parks_list}

            parks_score_list = []
            for r in rows:
                row_dict = dict(r._mapping)
                pid = row_dict["ParkID"]
                if pid in park_info:
                    park = park_info[pid]
                    row_dict.update({
                        "ParkName": park.Park,
                        "Latitude": park.Latitude,
                        "Longitude": park.Longitude
                    })
                    parks_score_list.append(row_dict)

        # 감정 기반 추천
        recommended = recommend_from_scored_parks(parks_score_list, emotions, top_n=top_n)
        return {"recommended_parks": recommended, "message": "추천 성공"}

    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"서버 오류: {str(e)}")