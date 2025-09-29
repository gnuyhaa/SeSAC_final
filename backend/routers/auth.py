from fastapi import APIRouter, HTTPException, Header, Request
from pydantic import BaseModel, validator
from db import engine
from sqlalchemy import text
import bcrypt, re, logging, jwt, os
from dotenv import load_dotenv


# ---------------------------
# 환경변수 불러오기
# ---------------------------
load_dotenv()
SECRET_KEY = os.getenv("JWT_SECRET_KEY")
ALGORITHM = "HS256"

# ---------------------------
# 로깅 설정
# ---------------------------
logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(levelname)s - %(message)s")

router = APIRouter()

# ---------------------------
# Pydantic 모델
# ---------------------------
class UserRegister(BaseModel):
    id: str  # 로그인용 ID
    nickname: str  # 별명
    password: str  # 비밀번호

    # ID 검증: 영어만
    @validator("id")
    def id_alpha(cls, v):
        if not re.fullmatch(r"[a-zA-Z0-9]+", v):
            raise ValueError("ID는 영어와 숫자만 가능합니다.")
        if len(v) < 4 or len(v) > 15:
            raise ValueError("ID는 4~15자리여야 합니다.")
        return v

    # 비밀번호 검증
    @validator("password")
    def password_complex(cls, v):
        if len(v) < 8 or len(v) > 20:
            raise ValueError("비밀번호는 8~20자리입니다.")
        if not re.search(r"[a-z]", v):
            raise ValueError("비밀번호에 영문 소문자가 포함되어야 합니다.")
        if not re.search(r"[0-9]", v):
            raise ValueError("비밀번호에 숫자가 포함되어야 합니다.")
        if not re.search(r"[!@#$%^&*(),.?\":{}|<>]", v):
            raise ValueError("비밀번호에 특수문자가 포함되어야 합니다.")
        return v

class UserLogin(BaseModel):
    id: str
    password: str

# 로그아웃하는 사용자 ID
class UserLogout(BaseModel):
    id: str  

# ---------------------------
# 회원가입
# ---------------------------
@router.post("/register")
def register(user: UserRegister):
    with engine.connect() as conn:
        # ID 중복 체크
        existing = conn.execute(
            text("SELECT * FROM tb_users WHERE id=:id"), {"id": user.id}
        ).fetchone()

        if existing:
            logging.warning(f"회원가입 실패 - 이미 존재하는 ID: {user.id}") 
            raise HTTPException(status_code=400, detail="이미 존재하는 ID입니다.")

        # 비밀번호 해싱
        hashed_pw = bcrypt.hashpw(user.password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
        # 회원 등록
        conn.execute(
            text(
                "INSERT INTO tb_users (id, nickname, password) "
                "VALUES (:id, :nickname, :password)"
            ),
            {"id": user.id, "nickname": user.nickname, "password": hashed_pw},
        )
        conn.commit()

    logging.info(f"회원가입 성공 - ID: {user.id}, 닉네임: {user.nickname}") 
    return {"message": "회원가입 성공"}


# ---------------------------
# 로그인
# ---------------------------
@router.post("/login")
def login(user: UserLogin):
    with engine.connect() as conn:
        # 사용자 조회
        result = conn.execute(
            text("SELECT * FROM tb_users WHERE id=:id"),
            {"id": user.id},
        ).mappings().fetchone() 

        if result and bcrypt.checkpw(user.password.encode('utf-8'), result["password"].encode('utf-8')):
            # JWT 생성   
            token_data = {"sub": user.id}
            token = jwt.encode(token_data, SECRET_KEY, algorithm=ALGORITHM)

            created_date = result["created_at"].strftime("%Y-%m-%d")
            logging.info(f"로그인 성공 - ID: {user.id}, 닉네임: {result['nickname']}")
            return {
                "message": "로그인 성공",
                "id": user.id,
                "nickname": result["nickname"],
                "user_no": result["user_no"],
                "created_date": created_date,
                "access_token": token
            }
        else:
            logging.warning(f"로그인 실패 - ID: {user.id}")
            raise HTTPException(status_code=401, detail="아이디 또는 비밀번호 오류")
        
# ---------------------------
# 로그아웃
# --------------------------- 
@router.post("/logout")
async def logout(request: Request, authorization: str | None = Header(default=None)):
    # 1️⃣ OPTIONS 요청은 무시
    if request.method == "OPTIONS":
        return {"message": "Preflight OK"}
    
    if authorization:
        try:
            token = authorization.replace("Bearer ", "")
            payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
            user_id = payload.get("sub")
            logging.info(f"로그아웃 - ID: {user_id}")
        except jwt.ExpiredSignatureError:
            logging.warning("로그아웃 시도 - 만료된 토큰")
            raise HTTPException(status_code=401, detail="만료된 토큰")
        except jwt.InvalidTokenError:
            logging.warning("로그아웃 시도 - 유효하지 않은 토큰")
            raise HTTPException(status_code=401, detail="유효하지 않은 토큰")
    else:
        logging.info("로그아웃 - 토큰 없음 (익명 요청)")

    return {"message": "로그아웃 성공"}