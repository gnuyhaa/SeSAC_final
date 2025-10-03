from fastapi import APIRouter, Body, HTTPException
from typing import Dict, Any, List
import math
import traceback

router = APIRouter()

# ===================== 녹지 카테고리 & 감정 가중치 =====================
CATEGORY_PROFILES = {
    "명상에 좋은 조용한 공원":   {"자연성":0.35,"편의성":0.20,"안정성":0.35,"활동성":0.05,"사회성":0.05},
    "마음 회복에 좋은 녹음길":     {"자연성":0.45,"편의성":0.20,"안정성":0.25,"활동성":0.05,"사회성":0.05},
    "에너지 충전에 좋은 활력 공원":{"자연성":0.30,"편의성":0.15,"안정성":0.05,"활동성":0.45,"사회성":0.05},
    "스트레스 풀기 좋은 공원":{"자연성":0.25,"편의성":0.10,"안정성":0.05,"활동성":0.55,"사회성":0.05},
    "함께 즐기는 커뮤니티 공원": {"자연성":0.20,"편의성":0.15,"안정성":0.05,"활동성":0.30,"사회성":0.30},
    "성취감 키우는 도전형 공원": {"자연성":0.15,"편의성":0.25,"안정성":0.15,"활동성":0.40,"사회성":0.05},
}

DIMS = ["자연성","편의성","안정성","활동성","사회성"]

EMOTION_WEIGHTS = {
    "불안":   {"자연성": 0.20, "편의성": 0.25, "안정성": 0.40, "활동성": 0.05, "사회성": 0.10},
    "우울":   {"자연성": 0.45, "편의성": 0.25, "안정성": 0.20, "활동성": 0.10, "사회성": 0.00},
    "스트레스":{"자연성": 0.30, "편의성": 0.15, "안정성": 0.05, "활동성": 0.50, "사회성": 0.00},
    "행복":   {"자연성": 0.25, "편의성": 0.15, "안정성": 0.05, "활동성": 0.30, "사회성": 0.25},
    "에너지": {"자연성": 0.35, "편의성": 0.20, "안정성": 0.10, "활동성": 0.30, "사회성": 0.05},
    "성취감": {"자연성": 0.20, "편의성": 0.25, "안정성": 0.15, "활동성": 0.35, "사회성": 0.05},
}

# ===================== 추천 알고리즘 =====================
def blend_emotion_profile(emotion_levels: Dict[str, int]) -> Dict[str, float]:
    levels = {k: int(emotion_levels.get(k, 0)) for k in EMOTION_WEIGHTS.keys()}
    active = {k: v for k, v in levels.items() if v > 0}
    if not active:
        return {d: 1.0/len(DIMS) for d in DIMS}
    total = sum(active.values())
    agg = {d: 0.0 for d in DIMS}
    for emo, lv in active.items():
        contrib = lv / total
        for d in DIMS:
            agg[d] += EMOTION_WEIGHTS[emo][d] * contrib
    s = sum(agg.values())
    return {d: (agg[d]/s if s>0 else 0.0) for d in DIMS}

def cosine_similarity(a: Dict[str,float], b: Dict[str,float]) -> float:
    num = sum(a[d]*b[d] for d in DIMS)
    denom = math.sqrt(sum(a[d]**2 for d in DIMS)) * math.sqrt(sum(b[d]**2 for d in DIMS))
    return num/denom if denom > 0 else 0.0

def recommend_category_by_mind(emotion_levels: Dict[str,int], top_n=3) -> List[Dict[str, Any]]:
    mind_profile = blend_emotion_profile(emotion_levels)
    scores = {}
    for cat, w in CATEGORY_PROFILES.items():
        scores[cat] = round(cosine_similarity(mind_profile, w), 3)
    ranked = sorted(scores.items(), key=lambda x: x[1], reverse=True)
    final_result = [{"category": cat, "score": score} for cat, score in ranked[:top_n]]
    return final_result

# ===================== FastAPI 엔드포인트 =====================
@router.post("/recommend_category")
def recommend_mind_category_api(
    emotions: Dict[str,int] = Body(..., description="감정 수준 입력 예: {'우울':1,'불안':3,'스트레스':5}")
):
    try:
        result = recommend_category_by_mind(emotions)
        return {"recommended_categories": result}
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"서버 오류: {str(e)}")