import pymysql
import datetime
from langchain_core.prompts import PromptTemplate
from langchain_openai import ChatOpenAI
from langchain_core.output_parsers import JsonOutputParser
import os
import pytz
from dotenv import load_dotenv

load_dotenv()


# 전 주 날짜 가져오기(datetime 맞춰서 시간까지 가져오기)
# 파이썬 일주일은 월요일이 한 주의 시작
def get_last_week_range():
    # 현재 시스템(한국 로컬) 기준 시각 사용
    tz = pytz.timezone("Asia/Seoul")
    today = datetime.datetime.now(tz)

    # 이번 주 월요일 00시 계산
    start_of_this_week = today - datetime.timedelta(days=today.weekday())
    start_of_this_week = start_of_this_week.replace(hour=0, minute=0, second=0, microsecond=0)

    # 지난주 월요일 ~ 지난주 일요일
    start_of_last_week = start_of_this_week - datetime.timedelta(days=7)
    end_of_last_week = start_of_this_week - datetime.timedelta(seconds=1)
    
    # DB의 DATETIME은 tzinfo가 없으므로 제거
    start_of_last_week = start_of_last_week.replace(tzinfo=None)
    end_of_last_week = end_of_last_week.replace(tzinfo=None)

    return start_of_last_week, end_of_last_week

def weekly_review(nickname:str):
    # DB연결
    conn = pymysql.connect(
        host=os.getenv("DB_HOST"),
        port=int(os.getenv("DB_PORT")),
        user=os.getenv("DB_USER"),
        password=os.getenv("DB_PASSWORD"),
        db=os.getenv("DB_NAME"),
        charset=os.getenv("DB_CHARSET", "utf8mb4")
    )

    try:
        start_of_last_week, end_of_last_week = get_last_week_range()
        tz = pytz.timezone("Asia/Seoul")
        
        # 1️⃣ 지난주 총평이 이미 있는지 확인 (지난주 총평은 이번주에 생성됨)
        with conn.cursor(pymysql.cursors.DictCursor) as cur:
            cur.execute("""
                SELECT review
                FROM tb_weekly_review
                WHERE nickname = %s
                AND create_date > %s
                LIMIT 1
            """, (nickname, end_of_last_week))  # end_of_last_week = 지난주 일요일 23:59:59
            existing = cur.fetchone()
            
            if existing:
                return existing['review'] # 이미 있으면 기존 총평 바로 반환

        # 2️⃣ 지난주 요약본 가져오기
        with conn.cursor(pymysql.cursors.DictCursor) as cur:
            cur.execute("""
                SELECT Create_date, TopEmotions, EmotionsSummary, RecommandCates, RecommandParks
                FROM tb_users_summary
                WHERE nickname = %s
                AND Create_date BETWEEN %s AND %s
                ORDER BY Create_date ASC
            """, (nickname, start_of_last_week, end_of_last_week))
            week_list = cur.fetchall()

        if len(week_list) < 3:
            conn.close()
            return '요약할 데이터가 충분하지 않습니다.'

        # 3️⃣ LLM용 입력 텍스트 생성
        contents = "\n\n".join(
            [
                f"Record {i+1} ({day['Create_date'].strftime('%m/%d %H:%M')})\n"
                f"감정_top3: {day['TopEmotions']}\n"
                f"감정_요약: {day['EmotionsSummary']}\n"
                f"추천_카테고리: {day['RecommandCates']}\n"
                f"추천_공원: {day['RecommandParks']}"
                for i, day in enumerate(week_list)
            ]
        )

        weekly_text = {'nickname': nickname, 'conctents': contents}

        # 4️⃣ LLM 총평 생성
        overall_prompt = PromptTemplate.from_template("""
        # Guidelines
        - Use only the information provided.
        - Do not make up information.
        - Do not exaggerate.

        당신은 따뜻한 위로의 말을 전해주는 상담사입니다. 
        아래는 한 사용자의 한 주 동안 서비스 이용 결과야. 
        데이터 그대로 말하지 말고, 약간의 관찰과 해석, 따뜻한 격려를 담아서 총평을 작성해줘. 
        말투는 사무적이지 않고 자연스럽게, 상담사가 말하듯 부드럽게 작성해.
        **"사용자"라는 단어는 사용하지 마세요. 대신 UserNickname님이라고 한 번만 언급하세요.**

        총평은 5줄 내외, 자연스러운 완전 문장으로 작성해주세요.

        Inputs
        UserNickname: {nickname}
        주간 데이터: {conctents}

        Return in JSON format:
        "review": ""
        """)

        overall_chain = overall_prompt | ChatOpenAI(model="gpt-4o-mini", temperature=0.5) | JsonOutputParser()
        weekly_review = overall_chain.invoke(weekly_text)
        
        # 5️⃣ 결과 저장 (주간 총평 1회만)
        with conn.cursor() as cur:
            sql = """
            INSERT INTO tb_weekly_review (nickname, create_date, review)
            VALUES (%s, %s, %s)
            """
            now_kst = datetime.datetime.now(tz).replace(tzinfo=None)
            cur.execute(sql, (nickname, now_kst, weekly_review['review']))
            conn.commit()

        return weekly_review['review']
    
    except Exception as e:
        print(f"[ERROR] weekly_review() failed for {nickname}: {str(e)}")
        return f"에러가 발생했습니다: {str(e)}"


    finally:
        # DB 연결은 무조건 닫기
        if conn:
            conn.close()