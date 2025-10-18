from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from llm.summary_chain import summary
import traceback

router = APIRouter()

# 요청 바디 스키마
class SummaryRequest(BaseModel):
    nickname: str

@router.post("/generate_summary")
def generate_summary_api(request: SummaryRequest):
    """
    한 번 사용 요약 생성 API
    - 입력: nickname
    - 동작: LLM 실행 → 요약 DB 저장 → 완료 메시지 반환
    """
    try:
        summary_result = summary(request.nickname)
        return {"message": f"{request.nickname} 님의 요약이 성공적으로 생성되었습니다.",
                "summary": summary_result}
    except Exception as e:
        print(traceback.format_exc())
        raise HTTPException(status_code=500, detail=f"요약 생성 중 오류 발생: {str(e)}")
