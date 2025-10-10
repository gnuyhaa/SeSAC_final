import pymysql
import json
from langchain_core.prompts import PromptTemplate
from langchain_openai import ChatOpenAI
from langchain_core.output_parsers import JsonOutputParser
import os
from dotenv import load_dotenv

load_dotenv()

def summary(nickname: str):
    
    # DB연결
    conn = pymysql.connect(
        host=os.getenv("DB_HOST"),
        port=int(os.getenv("DB_PORT")),
        user=os.getenv("DB_USER"),
        password=os.getenv("DB_PASSWORD"),
        db=os.getenv("DB_NAME"),
        charset=os.getenv("DB_CHARSET", "utf8mb4")
    )

    # 서비스 이용하면 이용 기록 바로 가져오기
    cur = conn.cursor(pymysql.cursors.DictCursor)
    # 날짜로 내림차순을 해서 첫번째만 가져오기 = 제일 최신 사용 정보 가져오기
    cur.execute("""
        SELECT e.nickname, e.create_date, depression, anxiety, stress, happiness, achievement, 
            energy, category_1, category_2, category_3,
            p.park_1 AS park_1,
            p.park_2 AS park_2,
            p.park_3 AS park_3
        FROM tb_users_emotions e
        LEFT JOIN tb_users_category_recommend u ON u.create_date = e.create_date AND u.nickname = e.nickname
        LEFT JOIN tb_users_parks_recommend p ON p.create_date = e.create_date AND p.nickname = e.nickname
        WHERE e.nickname = %s
        ORDER BY e.create_date DESC
        LIMIT 1;
    """, (nickname, )) 
    use = cur.fetchone()
    
    # 한 번 사용당 요약
    summary_prompt = PromptTemplate.from_template("""
    Input Data:
    우울: {depression}
    불안: {anxiety}
    스트레스: {stress}
    행복: {happiness}
    성취감: {achievement}
    에너지: {energy}

    Instructions:
    1. 감정 top3를 점수 순으로 내림차순 정렬해서 "top_emotions"에 담아주세요.
    - 점수가 같으면 모두 포함할 수 있음 (즉, top3 이상이 될 수도 있음)
    2. 각 감정은 {{"감정명": 점수}} 형태로 작성
    - 예: [{{"우울": 3}}, {{"불안": 2}}, {{"행복": 5}}]
    3. 전체 감정의 흐름을 자연어로 요약해서 "emotions_summary"에 한 줄(50자 이내)로 담아주세요.
    4. 우울, 불안, 스트레스는 부정적 감정으로 점수가 높을 수록 부정적이고, 행복, 에너지, 성취감은 긍정적 감정으로 점수가 높을 수록 긍정적인 상태
    5. JSON 형식을 정확히 지켜주세요.

    Return JSON in this exact format:
    {{
    "top_emotions": [],
    "emotions_summary": ""
    }}
    """)

    summary_chain = summary_prompt | ChatOpenAI(model="gpt-4o-mini") | JsonOutputParser()

    summary = summary_chain.invoke(use)
    print(summary)

    recommand_parks = [use['park_1'], use['park_2'], use['park_3']]
    recommand_cates = [use['category_1'], use['category_2'], use['category_3']]

    with conn.cursor() as cur:
        sql = """
        INSERT INTO tb_users_summary
        (nickname, Create_date, TopEmotions, EmotionsSummary, RecommandCates, RecommandParks)
        VALUES (%s, %s, %s, %s, %s, %s)
        """
        cur.execute(sql, (
            nickname,
            use['create_date'],
            json.dumps(summary['top_emotions'], ensure_ascii=False),
            summary['emotions_summary'],
            json.dumps(recommand_cates, ensure_ascii=False),
            json.dumps(recommand_parks, ensure_ascii=False)
        ))

    conn.commit()
    conn.close()
    print('요약 끝!')
    return summary