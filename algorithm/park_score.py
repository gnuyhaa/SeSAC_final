from typing import Dict, Any
import math

def clamp(x, lo, hi):
    return max(lo, min(hi, x))

def norm_ratio(x, ref):  # x/ref capped at 1.0
    if ref <= 0:
        return 0.0
    return clamp(x / ref, 0.0, 1.0)

def calc_indicators_refined(park: Dict[str, Any]) -> Dict[str, float]:
    name = park.get("name","")
    area_m2 = float(park.get("area", 0.0) or 0.0)
    area_ha = area_m2 / 10000.0 if area_m2 > 0 else 0.0

    # ========== 자연성 ========== K=3
    used_nat = 0
    ndvi = park.get("ndvi", 0.0)                        # ndvi 정규화 식생지표
    ndvi_norm = clamp(float(ndvi), 0.0, 1.0)
    if park.get("ndvi") is not None: used_nat += 1

    td = park.get("tree_density_est_per_ha")            # 수목 밀도
    if td is None:
        td_norm = 0.0
    else:
        td_clipped = clamp(float(td), 0.0, 150.0)
        td_norm = td_clipped / 150.0
        used_nat += 1

    gco = park.get("green_coverage_official_corrected") # 공식 면적까지 반영한 녹지(식생) 비율의 보정 점수
    if gco is None:
        gco_norm = 0.0
    else:
        g = float(gco)
        gco_norm = g if 0.0 <= g <= 1.0 else 0.0
        if gco_norm > 0: used_nat += 1

    naturalness = 0.45*ndvi_norm + 0.35*td_norm + 0.20*gco_norm
    nat_cov = used_nat / 3.0

    # ========== 편의성 ========== K=5
    used_conv = 0
    fac = park.get("facilities", {}) or {}             
    acc = park.get("accessibility", {}) or {}

    restroom = float(fac.get("restroom", 0) or 0.0)         # 화장실
    restroom_norm = norm_ratio(restroom, 2.0)
    if fac.get("restroom") is not None: used_conv += 1

    bench = float(fac.get("bench", 0) or 0.0)
    bench_per_ha = (bench/area_ha) if area_ha>0 else 0.0    # 장의자
    bench_norm = norm_ratio(bench_per_ha, 20.0)
    if fac.get("bench") is not None: used_conv += 1

    lighting = float(fac.get("lighting", 0) or 0.0)
    lighting_per_ha = (lighting/area_ha) if area_ha>0 else 0.0 # 조명
    lighting_norm = norm_ratio(lighting_per_ha, 20.0)
    if fac.get("lighting") is not None: used_conv += 1

    parking = float(fac.get("parking", 0.0) or 0.0)         # 면적당 주차대수
    parking_norm = norm_ratio(parking, 100.0)
    if fac.get("parking") is not None: used_conv += 1

    dist_subway_m = acc.get("distance_from_subway_m")       # 가장 가까운 역 or 정류장 거리
    if dist_subway_m is None:
        subway_norm = 0.0
    else:
        d = float(dist_subway_m)
        subway_norm = clamp((1000.0 - d)/1000.0, 0.0, 1.0)
        used_conv += 1

    convenience = (0.22*restroom_norm + 0.22*parking_norm + 0.16*bench_norm
                   + 0.16*lighting_norm + 0.24*subway_norm)
    conv_cov = used_conv / 5.0

    # ========== 안정성 ========== K=2
    used_safe = 0
    saf = park.get("safety", {}) or {}
    mgmt = 1.0 if saf.get("management_office", 0) else 0.0 # 관리실
    if saf.get("management_office") is not None: used_safe += 1
    
    light_sec_norm = norm_ratio(lighting_per_ha, 25.0)  # 조명
    if fac.get("lighting") is not None: used_safe += 1

    safety = 0.45*mgmt + 0.55*light_sec_norm
    safe_cov = used_safe / 2.0

    # ========== 활동성 ========== K=4
    used_act = 0
    act = park.get("activities", {}) or {}
    
    sports = norm_ratio(float(act.get("sports_facilities", 0) or 0.0), 5.0) # 운동장, 테니스장, 수영장, 궁도장,
    if act.get("sports_facilities") is not None: used_act += 1              # 야구장, 축구장, 농구장, 배구장,
                                                                            # 배드민턴장, 골프연습장, 게이트볼
    playground = norm_ratio(float(act.get("playground", 0) or 0.0), 3.0)    # 그네, 미끄럼틀, 모래밭, 시소, 정글짐
    if act.get("playground") is not None: used_act += 1                     # 사닥다리, 조합놀이
    
    equip = norm_ratio(float(act.get("exercise_equipment", 0) or 0.0), 15.0) # 체력단련시설
    if act.get("exercise_equipment") is not None: used_act += 1
    
    trails_km = (float(act.get("walking_trails", 0.0) or 0.0) / 1000.0)     # 산책등산로
    trails_norm = norm_ratio(trails_km, 2.0)
    if act.get("walking_trails") is not None: used_act += 1

    activity = 0.28*sports + 0.17*playground + 0.22*equip + 0.33*trails_norm
    act_cov = used_act / 4.0

    # ========== 사회성 ========== K=2
    used_soc = 0
    soc = park.get("social", {}) or {}
    
    cultural = norm_ratio(float(soc.get("cultural_facilities", 0) or 0.0), 2.0) # 동물원, 식물원, 도서관, 독서실, 문화회관, 야외음악당
    if soc.get("cultural_facilities") is not None: used_soc += 1
    
    cafe = norm_ratio(float(soc.get("cafe_restaurant", 0) or 0.0), 3.0)         # 휴게음식점, 매점
    if soc.get("cafe_restaurant") is not None: used_soc += 1

    sociality = 0.55*cultural + 0.45*cafe
    soc_cov = used_soc / 2.0

    # ========== 커버리지(coverage) 계산 ==========
    avg_cov = (nat_cov + conv_cov + safe_cov + act_cov + soc_cov) / 5.0
    coverage = math.sqrt(avg_cov)  # sqrt 모드

    return {
        "name": name,
        "주소": park['주소'],
        "자연성": round(clamp(naturalness, 0.0, 1.0), 3),
        "편의성": round(clamp(convenience, 0.0, 1.0), 3),
        "안정성": round(clamp(safety, 0.0, 1.0), 3),
        "활동성": round(clamp(activity, 0.0, 1.0), 3),
        "사회성": round(clamp(sociality, 0.0, 1.0), 3),
        "coverage": round(coverage, 3)
    }

# ========================= 실행 예시 =========================
if __name__ == "__main__":
    park = {
        "name": "송파나루",
        "주소": "서울특별시 송파구 잠실동 47",
        "area": 285757.6,
        "ndvi": 0.18891968,
        "tree_density_est_per_ha": 320.831361965526,
        "green_coverage_official_corrected": 0.323,
        "facilities": {"restroom": 6, "parking": 0.00032, "bench": 365, "lighting": 316},
        "safety": {"management_office": 1},
        "activities": {"sports_facilities": 2, "playground": None, "exercise_equipment": 49, "walking_trails": None},
        "social": {"cultural_facilities": None, "cafe_restaurant": 9},
        "accessibility": {"distance_from_subway_m": 623.0},
    }

    result = calc_indicators_refined(park)
    print(result)

# 결과 예시 {
#           'name': '송파나루', '주소': '서울특별시 송파구 잠실동 47', 
#           '자연성': 0.435, '편의성': 0.501, '안정성': 0.693, 
#           '활동성': 0.332, '사회성': 0.45, 'coverage': 0.856
#           }
