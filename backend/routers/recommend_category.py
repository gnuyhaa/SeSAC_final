from fastapi import APIRouter, Body, HTTPException
from typing import Dict
from algorithm.category_algorithm import recommend_category_by_mind
import traceback

router = APIRouter()

@router.post("/recommend_category")
def recommend_mind_category_api(
    emotions: Dict[str,int] = Body(..., description="감정 수준 입력 예: {'우울':1,'불안':3,'스트레스':5}")
):
    try:
        print("[녹지 추천 요청]")
        result = recommend_category_by_mind(emotions)
        return {"recommended_categories": result}
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"서버 오류: {str(e)}")