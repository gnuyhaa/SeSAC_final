# 공원 추천 api
from fastapi import APIRouter, Body, HTTPException
from typing import Dict, Any, List
from sqlalchemy import text
from ..db import engine
import traceback

router = APIRouter()

# ===================== 알고리즘 함수 =====================
def get_emotion_base_weights() -> Dict[str, Dict[str, float]]:
    # 5지표 합=1 (정규화)
    return {
        "불안":   {"Nature": 0.20, "Convenience": 0.25, "Safety": 0.40, "Activity": 0.05, "Social": 0.10},
        "우울":   {"Nature": 0.45, "Convenience": 0.25, "Safety": 0.20, "Activity": 0.10, "Social": 0.00},
        "스트레스":{"Nature": 0.30, "Convenience": 0.15, "Safety": 0.05, "Activity": 0.50, "Social": 0.00},
        "행복":   {"Nature": 0.25, "Convenience": 0.15, "Safety": 0.05, "Activity": 0.30, "Social": 0.25},
        "에너지": {"Nature": 0.35, "Convenience": 0.20, "Safety": 0.10, "Activity": 0.30, "Social": 0.05},
        "성취감": {"Nature": 0.20, "Convenience": 0.25, "Safety": 0.15, "Activity": 0.35, "Social": 0.05},
    }

def blend_emotion_weights(emotion_levels: Dict[str, int]) -> Dict[str, float]:
    """
    저장된 5지표(Nature/Convenience/Safety/Activity/Social)에 적용할 통합 가중치(합=1) 생성.
    emotion_levels: {"우울":1~5, "불안":1~5, ...} (0은 미고려)
    """
    base = get_emotion_base_weights()
    dims = ['Nature', 'Convenience', 'Safety', 'Activity', 'Social']

    levels = {k: int(emotion_levels.get(k, 0)) for k in base.keys()}
    active = {k: v for k, v in levels.items() if v > 0}
    if not active:
        return {d: (1.0/len(dims)) for d in dims}

    total = sum(active.values())
    agg = {d: 0.0 for d in dims}
    for emo, lv in active.items():
        contrib = lv / total
        for d in dims:
            agg[d] += base[emo][d] * contrib

    s = sum(agg.values())
    return {d: (agg[d]/s if s>0 else 0.0) for d in dims}

# ===================== 점수화된 공원 추천 =====================

def score_with_stored_indicators(park: Dict[str, Any], weights: Dict[str, float]) -> Dict[str, float]:
    """
    저장된 지표값 × 통합 가중치 → raw, final(신뢰도 있으면 곱)
    park 예: {"Name":"효창<시공원>", "Nature":0.446, "Convenience":0.462, "Safety":0.677, "Activity":1.0, "Social":0.15, "Trust":0.72}
    """
    dims = ['Name', 'Nature', 'Convenience', 'Safety', 'Activity', 'Social']
    raw = 0.0
    wsum = 0.0
    for d in dims:
        v = park.get(d)
        if isinstance(v, (int,float)):
            raw += float(v) * weights.get(d, 0.0)
            wsum += weights.get(d, 0.0)
    raw = (raw/wsum) if wsum > 0 else None

    Trust = park.get("Trust", None)
    if raw is None:
        final = None
    else:
        final = raw * float(Trust) if isinstance(Trust, (int,float)) else raw

    return {
        "raw_score": None if raw is None else round(raw, 3),
        'Trust': None if raw is None else round(Trust, 3),
        "final_score": None if final is None else round(final, 3)
    }

def recommend_from_scored_parks(parks_scored: List[Dict[str, Any]],
                                emotion_levels: Dict[str, int],
                                top_n: int = 5,
                                return_weights: bool = True) -> Dict[str, Any]:
    """
    이미 점수화된 공원 리스트를 받아 최종 추천 생성.
    parks_scored: [{"Name":..., "Nature":..., "Convenience":..., "Safety":..., "Activity":..., "Social":..., "Trust":(옵션)}]
    """
    weights = blend_emotion_weights(emotion_levels)
    results = []
    for p in parks_scored:
        s = score_with_stored_indicators(p, weights)
        results.append({
            "ID": p['ParkID'], # 공원 ID
            "Name": p.get("ParkName",""), # 이름
            "raw_score": s["raw_score"], # 원점수
            "Trust": s["Trust"], # 신뢰도(0/NaN 구별)
            "final_score": s["final_score"], # 최종 점수
        })
    # 점수 높은 순으로 정리
    ranked = sorted(results, key=lambda x: (x["final_score"] is not None, x["final_score"]), reverse=True)
    final_result = ranked[:top_n]
    return final_result

# ===================== API 엔드포인트 =====================
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
                WHERE (6371 * ACOS(
                       COS(RADIANS(:lat)) * COS(RADIANS(latitude)) *
                       COS(RADIANS(longitude) - RADIANS(:lon)) +
                       SIN(RADIANS(:lat)) * SIN(RADIANS(latitude))
                   )) <= 5;
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