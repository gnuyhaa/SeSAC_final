import pymysql
import datetime
from langchain_core.prompts import PromptTemplate
from langchain_openai import ChatOpenAI
from langchain_core.output_parsers import JsonOutputParser
import os
from dotenv import load_dotenv

load_dotenv()


# 전 주 날짜 가져오기(datetime 맞춰서 시간까지 가져오기)
# 파이썬 일주일은 월요일이 한 주의 시작
def get_last_week_range():
    # 현재 시스템(한국 로컬) 기준 시각 사용
    today = datetime.datetime.now()

    # 이번 주 월요일 00시 계산
    start_of_this_week = today - datetime.timedelta(days=today.weekday())
    start_of_this_week = start_of_this_week.replace(hour=0, minute=0, second=0, microsecond=0)

    # 지난주 월요일 ~ 지난주 일요일
    start_of_last_week = start_of_this_week - datetime.timedelta(days=7)
    end_of_last_week = start_of_this_week - datetime.timedelta(seconds=1)

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


    start_of_last_week, end_of_last_week = get_last_week_range()
    # 사용 요약본 일주일치 가져오기
    cur = conn.cursor(pymysql.cursors.DictCursor)

    query = """
        SELECT * FROM tb_users_emotions
        WHERE nickname = %s
        AND create_date BETWEEN %s AND %s
        """
    cur.execute(query, (nickname, start_of_last_week, end_of_last_week))

    week_list = cur.fetchall()

    # 한 주에 사용량이 3번이 안되면
    if len(week_list) < 3:
        return '요약할 데이터가 충분하지 않습니다.'

    # 일주일치 요약본 문자열 하나로 만들기
    conctents = "\n\n".join(
        [
            f"Record {i+1} ({day['Create_date'].strftime('%m/%d %H:%M') if 'Create_date' in day else ''})\n"
            f"감정_top3: {day['TopEmotions']}\n"
            f"감정_요약: {day['EmotionsSummary']}\n"
            f"추천_카테고리: {day['RecommandCates']}\n"
            f"추천_공원: {day['RecommandParks']}"
            for i, day in enumerate(week_list)
        ]
    )

    # 사용자 이름, 일주일치 요약본 합쳐서 llm 넣을 재료 만들기
    weekly_text = {}
    weekly_text['nickname'] = nickname
    weekly_text['conctents'] = conctents
    # 최종 평가 llm
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
    
    # 총평 저장 (create_date는 총평을 만드는 날짜로 인서트)
    with conn.cursor() as cur:
        sql = """
        INSERT INTO tb_weekly_review (nickname, create_date, review)
        VALUES (%s, %s, %s)
        """
        # tb_weekly_review의 create_date는 총평을 받은 그 순간 시간을 넣게 해놨음
        cur.execute(sql, (nickname, datetime.datetime.now(), weekly_review['review']))
        conn.commit()

    conn.close()

    return weekly_review['review']