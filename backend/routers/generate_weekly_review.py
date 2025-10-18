from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from llm.weekly_chain import weekly_review
import traceback

router = APIRouter()

# 요청 바디 스키마
class WeeklyReviewRequest(BaseModel):
    nickname: str

@router.post("/generate_weekly_review")
def generate_weekly_review_api(request: WeeklyReviewRequest):
    """
    주간 총평 생성 API
    - 입력: nickname
    - 동작: 일주일치 요약 불러오기 → LLM 총평 생성 → DB 저장 → 결과 반환
    """
    try:
        review = weekly_review(request.nickname)

        if review == "요약할 데이터가 충분하지 않습니다.":
            return {"message": review}

        return {
            "message": f"{request.nickname} 님의 주간 총평이 생성되었습니다.",
            "review": review
        }

    except Exception as e:
        print(traceback.format_exc())
        raise HTTPException(status_code=500, detail=f"주간 총평 생성 중 오류 발생: {str(e)}")
