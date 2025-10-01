from fastapi import FastAPI
from routers import auth, parks, park_category, emotions
from fastapi.middleware.cors import CORSMiddleware
import logging

# FastAPI 앱 실행
app = FastAPI()

logging.basicConfig(level=logging.INFO)

# router 등록
app.include_router(auth.router)   # auth 라우터
app.include_router(parks.router)  # parks 라우터
app.include_router(park_category.router) # park_category 라우터
app.include_router(emotions.router) # emotions 라우터

# CORS 설정
app.add_middleware(
    CORSMiddleware,
    allow_origins=["https://growth-doctor-front.web.app"],  
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 테스트용 루트 라우트 추가
@app.get("/")
def root():
    return {"message": "API 서버 정상 작동 중"}