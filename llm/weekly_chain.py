import datetime
import pytz
from langchain_core.prompts import PromptTemplate
from langchain_openai import ChatOpenAI
from langchain_core.output_parsers import JsonOutputParser
from sqlalchemy import text
from backend.db import engine


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

def weekly_review(nickname: str):
    try:
        start_of_last_week, end_of_last_week = get_last_week_range()
        tz = pytz.timezone("Asia/Seoul")

        # 1️⃣ 지난주 총평이 이미 있는지 확인 (지난주 총평은 이번주에 생성됨)
        with engine.connect() as conn:
            existing = conn.execute(text("""
                SELECT review
                FROM tb_weekly_review
                WHERE nickname = :nickname
                  AND create_date > :end_of_last_week
                LIMIT 1
            """), {
                "nickname": nickname,
                "end_of_last_week": end_of_last_week, # end_of_last_week = 지난주 일요일 23:59:59
            }).mappings().first()

            if existing:
                return existing['review'] # 이미 있으면 기존 총평 바로 반환

            # 2️⃣ 지난주 요약본 가져오기
            week_list = conn.execute(text("""
                SELECT
                    "Create_date" AS "Create_date",
                    "TopEmotions" AS "TopEmotions",
                    "EmotionsSummary" AS "EmotionsSummary",
                    "RecommandCates" AS "RecommandCates",
                    "RecommandParks" AS "RecommandParks"
                FROM tb_users_summary
                WHERE nickname = :nickname
                  AND "Create_date" BETWEEN :start_of_last_week AND :end_of_last_week
                ORDER BY "Create_date" ASC
            """), {
                "nickname": nickname,
                "start_of_last_week": start_of_last_week,
                "end_of_last_week": end_of_last_week,
            }).mappings().all()

        if len(week_list) < 3:
            return '요약할 데이터가 충분하지 않습니다.'

        # 3️⃣ LLM용 입력 텍스트 생성
        contents = "\n\n".join([
            f"Record {i+1} ({day['Create_date'].strftime('%m/%d %H:%M')})\n"
            f"감정_top3: {day['TopEmotions']}\n"
            f"감정_요약: {day['EmotionsSummary']}\n"
            f"추천_카테고리: {day['RecommandCates']}\n"
            f"추천_공원: {day['RecommandParks']}"
            for i, day in enumerate(week_list)
        ])

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
        weekly_result = overall_chain.invoke(weekly_text)

        # 5️⃣ 결과 저장 (주간 총평 1회만)
        with engine.begin() as conn:
            conn.execute(text("""
                INSERT INTO tb_weekly_review (nickname, create_date, review)
                VALUES (:nickname, timezone('Asia/Seoul', now()), :review)
            """), {
                "nickname": nickname,
                "review": weekly_result['review'],
            })

        return weekly_result['review']

    except Exception as e:
        print(f"[ERROR] weekly_review() failed for {nickname}: {str(e)}")
        return f"에러가 발생했습니다: {str(e)}"
