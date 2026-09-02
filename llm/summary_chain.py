import json
from langchain_core.prompts import PromptTemplate
from langchain_openai import ChatOpenAI
from langchain_core.output_parsers import JsonOutputParser
from sqlalchemy import text
from backend.db import engine


def summary(nickname: str):
    # 서비스 이용하면 이용 기록 바로 가져오기
    with engine.connect() as conn:
        # 날짜로 내림차순을 해서 첫번째만 가져오기 = 제일 최신 사용 정보 가져오기
        use = conn.execute(text("""
            SELECT e.nickname, e.create_date, depression, anxiety, stress, happiness, achievement,
                energy, category_1, category_2, category_3,
                p.park_1 AS park_1,
                p.park_2 AS park_2,
                p.park_3 AS park_3
            FROM tb_users_emotions e
            LEFT JOIN tb_users_category_recommend u
                ON u.create_date = e.create_date AND u.nickname = e.nickname
            LEFT JOIN tb_users_parks_recommend p
                ON p.create_date = e.create_date AND p.nickname = e.nickname
            WHERE e.nickname = :nickname
            ORDER BY e.create_date DESC
            LIMIT 1
        """), {"nickname": nickname}).mappings().first()

    if not use:
        raise ValueError(f"{nickname} 사용자의 요약 대상 데이터가 없습니다.")

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
    summary_result = summary_chain.invoke(dict(use))

    recommand_parks = [use['park_1'], use['park_2'], use['park_3']]
    recommand_cates = [use['category_1'], use['category_2'], use['category_3']]

    with engine.begin() as conn:
        conn.execute(text("""
            INSERT INTO tb_users_summary
            (nickname, Create_date, TopEmotions, EmotionsSummary, RecommandCates, RecommandParks)
            VALUES (:nickname, :create_date, :top_emotions, :emotions_summary, :recommand_cates, :recommand_parks)
        """), {
            "nickname": nickname,
            "create_date": use['create_date'],
            "top_emotions": json.dumps(summary_result['top_emotions'], ensure_ascii=False),
            "emotions_summary": summary_result['emotions_summary'],
            "recommand_cates": json.dumps(recommand_cates, ensure_ascii=False),
            "recommand_parks": json.dumps(recommand_parks, ensure_ascii=False),
        })

    print('요약 끝!')
    return summary_result
