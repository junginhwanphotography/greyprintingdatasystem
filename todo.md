# Grey Print Data System — TODO

## Branding & Setup
- [x] 앱 로고 생성 (Grey Print Data System 아이덴티티)
- [x] theme.config.js 다크 테마 + 골드 컬러 설정
- [x] app.config.ts 앱 이름 업데이트

## Database & Backend
- [x] DB 스키마 정의 (cameras, lenses, formats, films, paper_brands, paper_types, paper_sizes, print_data)
- [x] DB 마이그레이션 실행
- [x] tRPC API 구현 (CRUD for all hierarchy levels)
- [x] 검색 API 구현

## Screens & Navigation
- [x] Splash/로고 애니메이션 화면
- [x] 탭 네비게이션 (Browse, Search)
- [x] 계층형 네비게이션 (Stack Navigator)
- [x] 카메라 종류 리스트 화면
- [x] 렌즈군 리스트 화면
- [x] 판형 리스트 화면
- [x] 필름 종류 리스트 화면
- [x] 인화지 브랜드 리스트 화면
- [x] 인화지 종류 리스트 화면
- [x] 인화지 사이즈 리스트 화면
- [x] 인화 데이터 상세/입력 화면

## Features
- [x] 항목 추가 (모달 + FAB 버튼)
- [x] 항목 삭제 (스와이프 또는 롱프레스)
- [x] 인화 데이터 입력 및 저장
- [x] 인화 데이터 편집
- [x] 스마트 검색 기능 (실시간 검색)
- [x] 검색 결과에서 직접 이동
- [x] 브레드크럼 경로 표시
- [x] 실시간 다중 사용자 동기화 (DB 기반)
- [x] 마지막 수정 시간 표시

## 추가 기능 (v1.1)

- [x] 뒤로가기 버튼 (모든 계층 화면에 추가)
- [x] 로컬 검색 기능 (각 계층에서 검색 가능)
- [x] 스마트 검색 알고리즘 (여러 키워드 동시 검색, 점수 기반 정렬)
- [x] 검색 결과 하이라이트 (모든 매칭 단어 강조)
- [x] 검색 내 검색 기능 (모달 기반)
