from fastapi import FastAPI
from routers import auth, parks
from fastapi.middleware.cors import CORSMiddleware
import logging

# FastAPI 앱 실행
app = FastAPI()

logging.basicConfig(level=logging.INFO)

# router 등록
app.include_router(auth.router)   # auth 라우터
app.include_router(parks.router)  # parks 라우터

# CORS 설정
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)