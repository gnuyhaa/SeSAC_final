from fastapi import APIRouter, HTTPException
from sqlalchemy import text
from ..db import engine
import os, requests, time, traceback
from dotenv import load_dotenv

load_dotenv()
router = APIRouter()

API_KEY = os.getenv("OPENWEATHER_API_KEY")
BASE_URL = "https://api.openweathermap.org/data/2.5/weather"
AIR_URL = "http://api.openweathermap.org/data/2.5/air_pollution" # 미세먼지

CACHE_DURATION = 180  # 캐시 유효 시간(초) 3분
weather_cache = {}   

# 초미세먼지
def get_pm25_label(pm2_5: float) -> str:
    """PM2.5 값 기준으로 국내 환경부 한글 라벨 계산"""
    if pm2_5 <= 15:
        return "좋음"
    elif pm2_5 <= 35:
        return "보통"
    elif pm2_5 <= 75:
        return "나쁨"
    else:
        return "매우 나쁨"


# 미세먼지
def get_pm10_label(pm10: float) -> str:
    """PM10 값 기준으로 국내 환경부 한글 라벨 계산"""
    if pm10 <= 30:
        return "좋음"
    elif pm10 <= 80:
        return "보통"
    elif pm10 <= 150:
        return "나쁨"
    else:
        return "매우 나쁨"
    
# -----------------
# 공원 날씨 + 미세먼지 함수
# -----------------
def get_park_weather(lat: float, lon: float):
    try:
        """
        위도, 경도로 해당 위치의 실시간 날씨 + 미세먼지 정보를 가져옴
        """
        cache_key = f"{lat},{lon}"
        cached = weather_cache.get(cache_key)
        if cached and time.time() - cached["timestamp"] < CACHE_DURATION:
            return cached["data"]

        weather_params = {
            "lat": lat,
            "lon": lon,
            "appid": API_KEY,
            "units": "metric",
            "lang": "kr"
        }

        weather_res = requests.get(BASE_URL, params=weather_params)
        weather_data = weather_res.json()

        air_res = requests.get(AIR_URL, params=weather_params)
        air_data = air_res.json()

        pm2_5 = air_data["list"][0]["components"]["pm2_5"]
        pm10 = air_data["list"][0]["components"]["pm10"]

        data = {
            "lat": lat,
            "lon": lon,
            "weather": {
                "temp": round(weather_data["main"]["temp"], 1),
                "humidity": weather_data["main"]["humidity"],
                "icon": weather_data["weather"][0]["icon"]
            },
            "air": {
                "pm2_5": pm2_5,
                "pm2_5_label": get_pm25_label(pm2_5),
                "pm10": pm10,
                "pm10_label": get_pm10_label(pm10)
            }
        }

        weather_cache[cache_key] = {"timestamp": time.time(), "data": data}
        return data
        
    except Exception as e:
        print(f"[WARN] 날씨 API 오류 발생 : {e}")
        # 날씨 정보가 없더라도 API 전체 실패 방지
        return {"weather": None, "air": None}

# --------------
# 추천된 공원 리스트
# --------------
@router.get("/park_emotion")
def get_parks_emotion():
    with engine.connect() as conn:
        query = text("""
            SELECT 
                p.ID,
                p.Park,
                p.Address,
                p.Class,
                p.Description,
                p.Latitude,
                p.Longitude,
                p.Tel,
                k.Keyword_1,
                k.Keyword_2,
                k.Keyword_3
            FROM tb_parks p
            LEFT JOIN tb_parks_keywords k
            ON p.ID = k.ParkID
        """)
        result = conn.execute(query)
        db_data = [dict(row._mapping) for row in result]

    results = [
        {
            "name": row["Park"], 
            "address": row["Address"],   
            "type": row["Class"],   
            "des": row["Description"], 
            "lat": row["Latitude"],
            "lon": row["Longitude"],
            "tel": row["Tel"],
            "keyword1": row["Keyword_1"], 
            "keyword2" : row["Keyword_2"], 
            "keyword3" : row["Keyword_3"]
        }
        for row in db_data
    ]
    return results


# ------------------
# 공원 전체 리스트 
# ------------------
@router.get("/parks")
def get_parks():
    with engine.connect() as conn:
        result = conn.execute(
            text("SELECT * FROM tb_parks")  
        )
        db_data = [dict(row._mapping) for row in result]  

    results = [
        {
            "id": row["ID"],            
            "name": row["Park"], 
            "address" : row["Address"],   
            "type" : row["Class"],   
            "des" : row["Description"], 
            "lat": row["Latitude"],
            "lon": row["Longitude"],
            "tel" : row["Tel"]
        }
        for row in db_data
    ]
    return results

# ------------------
# 공원 세부정보 
# ------------------
@router.get("/parks/{park_id}")
def get_park_detail(park_id: int):
    """
    공원 상세정보: 기본정보 + 날씨 + 시설물
    """
    try:
        with engine.connect() as conn:
            # 공원 기본정보
            park_sql = text("""
                SELECT 
                    p.ID AS park_id,
                    p.Park AS ParkName,
                    p.Address,
                    p.Tel AS PhoneNumber,
                    p.Latitude,
                    p.Longitude
                FROM tb_parks p
                WHERE p.ID = :park_id
            """)
            park = conn.execute(park_sql, {"park_id": park_id}).mappings().first()
            if not park:
                raise HTTPException(status_code=404, detail="Park not found")

            # 시설물 정보
            facilities_sql = text("""
                SELECT 
                    Square, Trail, Pond, Fountain, Campground, Pavilion, Playground,
                    Sports_ground, Fitness_facility, Cultural_facility, Zoo,
                    Botanical_garden, Toilet, Parking, Convenience
                FROM tb_parks_facilities
                WHERE ParkID = :park_id
            """)
            facilities_row = conn.execute(facilities_sql, {"park_id": park_id}).mappings().first()

            facilities_kor = []
            if facilities_row:
                facility_map = {
                    "Square": "광장",
                    "Trail": "산책로/등산로",
                    "Pond": "연못",
                    "Fountain": "분수",
                    "Campground": "야영장/야유회장",
                    "Pavilion": "정자",
                    "Playground": "놀이터",
                    "Sports_ground": "운동장",
                    "Fitness_facility": "체력단련시설",
                    "Cultural_facility": "문화시설",
                    "Zoo": "동물원",
                    "Botanical_garden": "식물원",
                    "Toilet": "화장실",
                    "Parking": "주차장",
                    "Convenience": "편의시설",
                }
                for key, label in facility_map.items():
                    if facilities_row[key]:
                        facilities_kor.append(label)

            # 날씨 정보
            weather_data = get_park_weather(park["Latitude"], park["Longitude"])

            # 결과 합치기
            result = {
                "id": park["park_id"],
                "name": park["ParkName"],
                "address": park["Address"],
                "tel": park["PhoneNumber"],
                "weather": weather_data["weather"],
                "air": weather_data["air"],
                "facilities": facilities_kor
            }

            return result

    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))