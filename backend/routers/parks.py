from fastapi import APIRouter, HTTPException
from sqlalchemy import text
from db import engine
import os
import requests
from dotenv import load_dotenv
import time

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
    
# --------------
# 추천된 공원 리스트
# --------------
@router.get("/park_emotion")
def get_parks():
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

# -----------------
# 공원 날씨 + 미세먼지 조회 (캐시적용)
# -----------------

@router.get("/park_weather")
def get_park_weather(lat: float, lon: float):
    """
    위도, 경도로 해당 위치의 실시간 날씨 + 미세먼지 정보를 가져옴 (캐시 적용)
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
