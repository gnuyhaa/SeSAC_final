from typing import Dict, Any, List
import pymysql
from dotenv import load_dotenv
import os 

load_dotenv()

def get_db_connection():
    """DB 연결 생성"""
    return pymysql.connect(
        host=os.getenv("DB_HOST"),
        port=int(os.getenv("DB_PORT")),
        user=os.getenv("DB_USER"),
        password=os.getenv("DB_PASSWORD"),
        db=os.getenv("DB_NAME"),
        charset=os.getenv("DB_CHARSET", "utf8mb4"),
        cursorclass=pymysql.cursors.DictCursor
    )



def parks_and_scores_in_5km(latitude, longitude):
    conn = get_db_connection()

    # 사용자 현재 위치부터 반경 5km이내 공원 가져오는 SELECT문 (python코드로 걸러내는 것 보다 이게 빠름)
    cur = conn.cursor()
    query = """
    SELECT 
        s.ParkID, s.ParkName, s.Nature, s.Convenience, s.Safety, s.Activity, s.Social, s.Trust,
        p.Latitude, p.Longitude,
        (6371 * ACOS(
            COS(RADIANS(%s)) * COS(RADIANS(p.latitude)) *
            COS(RADIANS(p.longitude) - RADIANS(%s)) +
            SIN(RADIANS(%s)) * SIN(RADIANS(p.latitude))
        )) AS distance
    FROM tb_parks_score s
    JOIN tb_parks p ON s.ParkID = p.ID
    HAVING distance <= 5
    ORDER BY distance;
    """

    # 사용자한테 받은 위도, 경도
    cur.execute(query, (latitude, longitude, latitude))
    parks_list = cur.fetchall()

    cur.close()
    conn.close()

    return parks_list


# 감정 가중치(연구 기반)
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
    return {d: (agg[d]/s if s > 0 else 0.0) for d in dims}

# 점수화된 공원 추천
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

# 최종 추천 로직 (유저 위도,경도, 마음 상태 받기)
def recommend_from_scored_parks(latitude, longitude, emotion_levels: Dict[str, int],
                                top_n: int = 6,
                                return_weights: bool = True) -> Dict[str, Any]:
    
    parks_scored = parks_and_scores_in_5km(latitude, longitude)
    weights = blend_emotion_weights(emotion_levels)
    
    results = []
    for p in parks_scored:
        s = score_with_stored_indicators(p, weights)
        results.append({
            "ID": p['ParkID'], # 공원 ID
            "Park": p.get("Park",""), # 이름
            "raw_score": s["raw_score"], # 원점수
            "Trust": s["Trust"], # 신뢰도(0/NaN 구별)
            "final_score": s["final_score"], # 최종 점수
        })
    # 점수 높은 순으로 정리
    ranked = sorted(results, key=lambda x: (x["final_score"] is not None, x["final_score"]), reverse=True)
    final_result = ranked[:top_n]
    return final_result