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
    emotions: Dict[str, int] = Body(..., description="감정 수준 예: {'우울':5,'불안':5,'행복':3}"),
    top_n: int = Body(6, description="추천 상위 N개")
):
    try:
        print("[공원 추천 요청]")
        # 알고리즘 호출
        recommended = recommend_from_scored_parks(lat, lon, emotions, top_n=top_n)

        # 결과 반환
        if not recommended:
            return {"recommended_parks": [], "message": "추천 결과가 없습니다."}
          
        return {"recommended_parks": recommended, "message": "추천 성공"}

    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"서버 오류: {str(e)}")