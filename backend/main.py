from fastapi import FastAPI
from routers import auth, parks, emotions, recommend_parks, recommend_category, recommend_for_user
from fastapi.middleware.cors import CORSMiddleware
import logging

# FastAPI 앱 실행
app = FastAPI()

logging.basicConfig(level=logging.INFO)

# router 등록
app.include_router(auth.router)   # auth 라우터
app.include_router(parks.router)  # parks 라우터
app.include_router(emotions.router) # emotions 라우터
app.include_router(recommend_parks.router) # recommend_parks 라우터
app.include_router(recommend_category.router) # recommend_parks 라우터
app.include_router(recommend_for_user.router) # recommend_parks 라우터

# CORS 설정
app.add_middleware(
    CORSMiddleware,
    allow_origins=["https://growth-doctor-front.web.app", "http://localhost:3000", "http://176.16.0.55:3000"],  
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 테스트용 루트 라우트 추가
@app.get("/")
def root():
    return {"message": "API 서버 정상 작동 중"}