## 커밋 타입형식
- 기능: 새로운 기능 추가
- 버그: 버그 수정
- 문서: 문서 수정
- 스타일: 코드 형식, 공백, 세미콜론 등 수정 (기능 변경 없음)
- 리팩토링: 코드 구조 개선 (기능 변경 없음)
- 성능: 성능 개선
- 테스트: 테스트 코드 추가/수정
- 기타: 빌드, 설정, 기타 자잘한 변경

> git commit -m '<타입>:<짧은설명>'

## 백엔드 구조 설명

  ├─ backend/  
  │   ├─ routers/  
  │   │   ├─ auth.py # 로그인 API  
  │   │   ├─ emotions.py # 사용자 감정 저장 API  
  │   │   ├─ generate_summary.py # 한 번 사용 요약 API  
  │   │   ├─ generate_weekly_review.py # 주간 총평 API  
  │   │   ├─ pakrs.py # 공원 리스트 + 날씨 API  
  │   │   ├─ recommend_category.py # 녹지 추천 API  
  │   │   ├─ recommend_for_user.py # category+parks 저장 API  
  │   │   ├─ recommend_parks.py # 공원 추천 API  
  │   │   ├─ visit.py # 공원 방문 여부 저장 API  
  │   ├─ .env  
  │   ├─ db.py  
  │   └─ main.py  

## 알고리즘, llm 코드 구조 설명
  ├─ algorithm/ # 알고리즘 코드  
  │   ├─ category_algorithm.py # 녹지 유형 추천 알고리즘  
  │   ├─ parks_algorithm.py # 공원 추천 알고리즘  
  ├─ llm/ # llm 코드  
  │   ├─ summary_chain.py # LLM 요약 관련 코드  
  │   ├─ weekly_chain.py # 주간 총평 LLM 관련 코드  