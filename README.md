# **💊 현대인을 위한 녹지 처방전**
본 프로젝트는 **새싹 용산캠퍼스**에서 진행되었습니다. 현대인을 위한 녹지 처방전 '마음C'를 개발하여 이 프로젝트로 최우수상을 수상하였습니다.

## **프로젝트 소개**

**마음C**는 "도심 속에서 어디서 마음의 휴식을 얻을 수 있을까?"를 고민하는 바쁜 현대인을 위한 **맞춤형 녹지 추천 서비스**입니다.  서울시 공원 및 녹지 데이터를 분석하여 개인의 마음 상태에 적합한 휴식 공간을 제안합니다.

특히, 마음 건강 관리에 대한 관심은 높지만 정보 부족과 실천이 어려운 도시 거주자들이 웹 기반 인터페이스를 통해 쉽게 접근할 수 있도록 제공합니다.

---

## 프로젝트 진행 기간

- 2025.09.04 ~ 2025.10.15

---

## **프로젝트 구조**

```
.
├── algorithm/        # 추천 알고리즘
├── backend/          # FastAPI 기반의 메인 API 서버
├── frontend/         # React 기반의 웹 프론트엔드 (사용자 인터페이스)
├── llm/              # LLM 
├── analysis/         # 데이터 수집 및 분석
├── crawler/          # 데이터 크롤링
├── datebase/         # 데이터베이스 설정
├── README.md         # 프로젝트 안내 문서
└── requirements.txt  # 설치된 모듈 문서
```

---

## **Git 협업 워크플로우**

- **`main`**: **최신 버전**을 위한 브랜치입니다. 오직 `dev` 브랜치의 내용만 Merge하며, 직접적인 수정은 절대 금지합니다.
- **`dev`**: **다음 버전 개발**을 위한 통합 브랜치입니다. 모든 기능 개발은 이 브랜치에서 시작하고, 완료된 기능은 이 브랜치로 다시 병합됩니다.
- **`feature/{기능이름}`**: **신규 기능 개발**을 위한 브랜치입니다. 개발 완료 후 `dev`으로 Pull Request을 보냅니다. (예: `feature/login-api`)
- **`workspace`**: **데이터 분석 및 실험용 코드**를 관리하는 브랜치입니다. 서비스 구현 이전 단계에서 사용되었으며, 데이터 분석 결과, DB 연동 시범 코드 등을 포함합니다.

## **협업 절차**

1. `dev` , `workspace` 브랜치에서 최신 코드를 `pull` 받습니다.
2. `feature/기능이름` 브랜치를 새로 생성합니다. 
3. 기능 개발을 완료하고 자신의 `feature` 브랜치 / `workspace` 브랜치에 커밋합니다.
4. GitHub에서 `dev` 브랜치를 대상으로 **Pull Request(PR)**를 생성합니다.
5. 다른 팀원 1명 이상에게 **코드 리뷰**를 받고 승인(Approve)을 받습니다.
6. PR을 `dev` 브랜치에 병합(Merge)합니다.

---

## **기술 스택**

실무 환경과 동일한 기술 스택을 사용하여 확장 가능하고 안정적인 시스템을 구축합니다.

| **역할** | **기술** | 설명 |
| --- | --- | --- |
| **데이터 분석** | `Pandas`,  `Scipy`, `Matplotlib`, `Seaborn` | 데이터 상관관계 분석 |
| **프론트엔드** |  `React`, `Axios`, `Firebase` (호스팅) | 사용자 인터페이스 개발 및 배포 |
| **백엔드** | `FastAPI` (Python), `Uvicorn` (ASGI 서버), `Render`(배포) | API 서버 구현 및 배포 환경 구성 |
| **Open API** | `Kakao map`- 지도, `Openweather` - 날씨 | 지도 시각화 및 날씨 데이터 활용 |
| **LLM / AI** | `Langchain`  | 감정 분석 및 맞춤형 추천 프롬프트 체인 구축 |
| **데이터베이스** | `AWS`, `MariaDB` | 데이터 저장 및 클라우드 인프라 운영 |
| **협업 도구** | `Notion`, `Figma`, `Git` | 기획·디자인·버전 관리 협업 |

---

## **차별점 및 경쟁 우위**

기존 서비스들은 마음 건강과 공원 추천을 각각 제공하는 반면, **마음C**는 '사용자 감정을 활용한 맞춤 공원 추천’과 ‘LLM 감정 분석'을 하나로 통합하여 **현대인을 위한 맞춤형 녹지 처방 서비스**를 제공합니다.

---

## **데이터베이스 설계**

**AWS로 구축한 RDS(MariaDB) 서버**에 아래와 같은 구조로 데이터를 저장합니다. 모든 데이터는 MariaDB에서 관리합니다.

**1.  `tb_parks`- 공원 정보**

**2. `tb_parks_categorys`- 녹지 유형 정보**

**3. `tb_parks_keywords`- 공원 키워드 정보**

**4. `tb_parks_score`- 공원 점수 정보**

**5. `tb_parks_visit_log`- 공원 방문 로그 정보**

**6. `tb_trails`-  산책길 정보**

**7. `tb_parks_facilities`- 공원 시설물 정보** 

**8. `tb_users`- 사용자 정보**

**9. `tb_users_category_recommend`- 추천된 녹지 유형 정보**

**10. `tb_users_emotions`- 사용자 감정 분석 정보**

**11.  `tb_users_parks_recommend`- 추천된 공원 정보**

**12.  `tb_users_parks_status`- 사용자의 방문 상태 정보**

**13.  `tb_users_summary`- 일일 감정 요약 정보**

**14.  `tb_weekly_review`- 지난주 감정 요약 데이터 정보**

---

## **환경 변수**

`.env` 파일을 통해 환경 변수를 관리합니다. 

- `DB_HOST`: AWS RDS MariaDB 데이터베이스 연결
- `JWT_SECRET_KEY` : 비밀번호 해싱에 필요한 시크릿 키
- `OPENWEATHER_API_KEY` : openweather API 키
- `OPENAI_API_KEY` : Open AI API 키
- `REACT_APP_API_URL` : 백엔드 서버 URL
- `REACT_APP_KAKAO_MAP_KEY` : 카카오맵 API 키

---

## **서비스 아키텍처**
<img width="2276" height="1703" alt="image" src="https://github.com/user-attachments/assets/d4ead858-8dd0-4ee9-b8f5-e8318983d036" />

---
## **시연 영상**
