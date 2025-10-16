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

## 프론트엔드 구조 설명
├─ frontend/
│  ├─ public/
│  │  ├─ images/
│  │  │  ├─ map_pin_green.svg      # 추천 공원 마커(비활성화 상태)
│  │  │  ├─ map_pin_orange.svg     # 추천 공원 마커(활성화 상태)
│  │  │  └─ my_location.svg        # 사용자 현재 위치 아이콘
│  │  ├─ favicon.svg               # 브라우저 탭 아이콘
│  │  └─ index.html                # 웹 실행 기본 HTML 파일
│  │
│  ├─ src/
│  │  ├─ assets/                   # 공원 시설물 및 애니메이션 리소스
│  │  │  ├─ *.png                  # 시설물 아이콘
│  │  │  └─ pills.json             # 로딩 애니메이션 파일
│  │  │
│  │  ├─ components/               # 공통 UI 컴포넌트
│  │  │  ├─ Navbar.js              # 상단 네비게이션 바 컴포넌트
│  │  │  ├─ Navbar.css             # 네비게이션 바 스타일
│  │  │  └─ PrivateRoute.js        # 인증 필요 페이지 접근 제어
│  │  │
│  │  ├─ images/                   # 지도 시각화용 이미지
│  │  │  └─ seoul_districts.svg    # 서울시 자치구 경계 지도
│  │  │
│  │  ├─ pages/                    # 주요 페이지
│  │  │  ├─ Auth.js / Auth.css     # 로그인, 회원가입 페이지
│  │  │  ├─ EmotionCheck.js        # 마음상태 진단 페이지
│  │  │  ├─ GreenList.js           # 전체 공원 목록 및 상세 정보(날씨, 시설물) 지도 페이지
│  │  │  ├─ Map.js                 # 추천 공원 지도 페이지
│  │  │  ├─ Main.js                # 웹 메인 페이지
│  │  │  ├─ MyPage.js / MyPage.css # 날짜별 추천 공원 확인, 방문 공원 지도 표시, 감정 리포트 등 개인 맞춤형 마이 페이지
│  │  │  └─ WaitingPage.js         # 처방전 스타일의 추천 결과 대기 화면
│  │  │
│  │  ├─ App.js / App.css          # 페이지 라우팅 및 전역 구조 설정
│  │  ├─ axiosConfig.js            # API 요청 전역 설정(기본 URL, 인터셉터 등)
│  │  └─ index.js / index.css      # React 진입 및 전역 스타일 정의
│  │
│  ├─ package.json                 # 프로젝트 의존성 및 스크립트 정의
│  └─ package-lock.json            # 의존성 잠금 파일