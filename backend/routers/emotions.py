from fastapi import APIRouter, HTTPException
from sqlalchemy import text
from db import engine
from datetime import date
import traceback

router = APIRouter()

@router.post("/emotions")
def save_emotions(data: dict):
    try:
        print("받은 데이터:", data)

        with engine.begin() as conn:
            conn.execute(text("""
                INSERT INTO tb_user_emotions (
                    nickname, create_date, depression, anxiety, stress, happiness, achievement, energy, latitude, longitude
                ) VALUES (
                    :nickname, :create_date, :depression, :anxiety, :stress, :happiness, :achievement, :energy, :latitude, :longitude
                )
            """), {
                "nickname": data["nickname"],
                "create_date": date.today().isoformat(),  # YYYY-MM-DD
                "depression": data["emotions"]["depression"],
                "anxiety": data["emotions"]["anxiety"],
                "stress": data["emotions"]["stress"],
                "happiness": data["emotions"]["happiness"],
                "achievement": data["emotions"]["achievement"],
                "energy": data["emotions"]["energy"],
                "latitude": data.get("latitude"),
                "longitude": data.get("longitude")
            })

        return {"message": "User emotions saved"}

    except Exception as e:
        print("DB 저장 중 에러 발생:", str(e))
        traceback.print_exc()  # 에러 스택까지 Render 로그에 출력
        raise HTTPException(status_code=500, detail="DB 저장 실패")

@router.put("/emotions/{nickname}/location")
def update_location(nickname: str, data: dict):
    with engine.begin() as conn:
        conn.execute(text("""
            UPDATE tb_user_emotions
            SET latitude = :latitude, longitude = :longitude
            WHERE id = (
                SELECT id FROM (
                    SELECT id
                    FROM tb_user_emotions
                    WHERE nickname = :nickname
                    ORDER BY id DESC
                    LIMIT 1
                ) AS sub
            )
        """), {
            "latitude": data["latitude"],
            "longitude": data["longitude"],
            "nickname": nickname
        })
    return {"message": "Location updated"}

