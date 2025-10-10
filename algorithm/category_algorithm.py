# 마음 상태(점수)에 따른 녹지 유형 추천
from typing import Dict, Any
import math

CATEGORY_PROFILES = {
    "명상에 좋은 조용한 공원":   {"자연성":0.35,"편의성":0.20,"안정성":0.35,"활동성":0.05,"사회성":0.05},
    "마음 회복에 좋은 녹음길":     {"자연성":0.45,"편의성":0.20,"안정성":0.25,"활동성":0.05,"사회성":0.05},
    "에너지 충전에 좋은 활력 공원":{"자연성":0.30,"편의성":0.15,"안정성":0.05,"활동성":0.45,"사회성":0.05},
    "스트레스 풀기 좋은 야외운동":{"자연성":0.25,"편의성":0.10,"안정성":0.05,"활동성":0.55,"사회성":0.05},
    "함께 즐기는 커뮤니티 공원": {"자연성":0.20,"편의성":0.15,"안정성":0.05,"활동성":0.30,"사회성":0.30},
    "성취감 키우는 도전형 공원": {"자연성":0.15,"편의성":0.25,"안정성":0.15,"활동성":0.40,"사회성":0.05},
}
DIMS = ["자연성","편의성","안정성","활동성","사회성"]

# 감정별 연구 기반 가중치
EMOTION_WEIGHTS = {
    "불안":   {"자연성": 0.20, "편의성": 0.25, "안정성": 0.40, "활동성": 0.05, "사회성": 0.10},
    "우울":   {"자연성": 0.45, "편의성": 0.25, "안정성": 0.20, "활동성": 0.10, "사회성": 0.00},
    "스트레스":{"자연성": 0.30, "편의성": 0.15, "안정성": 0.05, "활동성": 0.50, "사회성": 0.00},
    "행복":   {"자연성": 0.25, "편의성": 0.15, "안정성": 0.05, "활동성": 0.30, "사회성": 0.25},
    "에너지": {"자연성": 0.35, "편의성": 0.20, "안정성": 0.10, "활동성": 0.30, "사회성": 0.05},
    "성취감": {"자연성": 0.20, "편의성": 0.25, "안정성": 0.15, "활동성": 0.35, "사회성": 0.05},
}

def blend_emotion_profile(emotion_levels: Dict[str, int]) -> Dict[str, float]:
    # 감정 강도(1~5)로 마음 프로파일 생성
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

# 코사인 유사도 쓰는 이유 - 마음 상태의 분포(패턴)과 녹지 유형의 점수 패턴을 비교하고 싶은 거여서
def cosine_similarity(a: Dict[str,float], b: Dict[str,float]) -> float:
    # 두 벡터의 코사인 유사도
    num = sum(a[d]*b[d] for d in DIMS)
    denom = math.sqrt(sum(a[d]**2 for d in DIMS)) * math.sqrt(sum(b[d]**2 for d in DIMS))
    return num/denom if denom > 0 else 0.0

def recommend_category_by_mind(emotion_levels: Dict[str,int], top_n=3) -> Dict[str,Any]:
    # 마음 프로파일과 카테고리 프로파일의 유사도 비교
    mind_profile = blend_emotion_profile(emotion_levels)
    scores = {}
    for cat, w in CATEGORY_PROFILES.items():
        scores[cat] = round(cosine_similarity(mind_profile, w), 3)
    best_cat = max(scores, key=lambda k: scores[k])
    
    # 점수 기준 정렬
    ranked = sorted(scores.items(), key=lambda x: x[1], reverse=True)
    
    # JSON 형태로 변환
    final_result = [{"category": cat, "score": score} for cat, score in ranked[:top_n]]

    return final_result
