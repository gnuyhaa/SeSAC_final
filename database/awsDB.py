from dotenv import load_dotenv
import os
# .env 파일 불러오기
load_dotenv()

# 본인 계정 접속
import pymysql

conn = pymysql.connect(
    host=os.getenv("DB_HOST"),
    port=int(os.getenv("DB_PORT")),
    user=os.getenv("DB_USER"),
    password=os.getenv("DB_PASSWORD"),
    db=os.getenv("DB_NAME"),
    charset=os.getenv("DB_CHARSET", "utf8mb4")
)
cur = conn.cursor()
