from fastapi import FastAPI
from routers import auth, parks
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text
from db import engine

# FastAPI 앱 실행
app = FastAPI()

# 각 router를 앱에 등록
app.include_router(auth.router)
app.include_router(parks.router)


# CORS 설정
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "*"
    ],  
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

