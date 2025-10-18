from fastapi import FastAPI
from backend.routers import auth, parks, emotions, visit
from backend.routers import recommend_parks, recommend_category, recommend_for_user
from backend.routers import generate_summary, generate_weekly_review
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
app.include_router(visit.router) # visit 라우터
app.include_router(generate_summary.router) 
app.include_router(generate_weekly_review.router)

# CORS 설정
app.add_middleware(
    CORSMiddleware,
    allow_origins=["https://maeum-c.web.app", "http://localhost:3000", "http://176.16.0.55:3000"],  
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 테스트용 루트 라우트 추가
@app.get("/")
def root():
    return {"message": "API 서버 정상 작동 중"}