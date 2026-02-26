# Grey Print Data System — Interface Design

## App Concept
사진 인화(Darkroom Printing)에 필요한 데이터를 기입·수정·열람하는 전문 도구 앱. 여러 기기에서 실시간으로 공유되며, 계층형 탐색 구조를 통해 카메라 → 렌즈 → 판형 → 필름 → 인화지 브랜드 → 인화지 종류 → 인화지 사이즈 순서로 탐색하고, 최종 단계에서 인화 데이터를 입력·열람한다.

---

## Color Palette

| Token | Light | Dark | Usage |
|-------|-------|------|-------|
| `background` | `#0D0D0D` | `#0D0D0D` | 앱 배경 (다크 테마 고정) |
| `surface` | `#1A1A1A` | `#1A1A1A` | 카드, 리스트 아이템 배경 |
| `foreground` | `#F0F0F0` | `#F0F0F0` | 주요 텍스트 |
| `muted` | `#888888` | `#888888` | 보조 텍스트 |
| `primary` | `#C8A96E` | `#C8A96E` | 골드 포인트 컬러 (Grey Print 브랜드) |
| `border` | `#2E2E2E` | `#2E2E2E` | 구분선 |
| `success` | `#4CAF50` | `#4CAF50` | 저장 성공 |
| `error` | `#E53935` | `#E53935` | 오류 |

> 다크룸의 분위기를 반영한 다크 테마 고정. 골드(#C8A96E)는 Grey Print 브랜드 아이덴티티.

---

## Screen List

### 1. Splash / Logo Animation Screen
- Grey Print Data System 로고 + 텍스트 페이드인 애니메이션
- 로고 아래 "Grey Print Data System" 타이포그래피
- 2초 후 자동으로 메인 화면으로 전환

### 2. Main Navigation Screen (탭 기반)
- **Browse Tab**: 계층형 탐색 (카메라 → 인화지 사이즈)
- **Search Tab**: 전체 데이터 스마트 검색

### 3. Category List Screen (계층형 공통 화면)
각 계층에서 공통으로 사용되는 리스트 화면:
- 헤더: 현재 계층 이름 + 브레드크럼 경로
- 아이템 리스트 (FlatList): 이름 + 하위 항목 수
- 하단 FAB: 새 항목 추가 버튼
- 스와이프 삭제 (swipe-to-delete)
- 각 아이템 탭 → 다음 계층으로 이동

**계층 구조:**
1. 카메라 종류 (Camera Type)
2. 렌즈군 (Lens Group) — 선택한 카메라의 렌즈
3. 판형 (Format) — 35mm, 120, 4x5 등
4. 필름 종류 (Film Type) — Kodak Portra 400 등
5. 인화지 브랜드 (Paper Brand) — Ilford, Kodak 등
6. 인화지 종류 (Paper Type) — Glossy, Matte 등
7. 인화지 사이즈 (Paper Size) — 4x6, 8x10 등

### 4. Print Data Detail Screen (최종 데이터 입력/열람)
인화지 사이즈 선택 후 나타나는 데이터 입력 화면:
- 상단: 전체 경로 브레드크럼
- 데이터 필드들 (편집 가능):
  - 노출 시간 (Exposure Time)
  - 조리개 (Aperture / F-stop)
  - 필터 (Filter — Yellow/Magenta/Cyan 값)
  - 현상액 (Developer)
  - 현상 시간 (Development Time)
  - 온도 (Temperature)
  - 희석 비율 (Dilution)
  - 메모 (Notes)
- 편집/저장 버튼
- 마지막 수정 시간 표시

### 5. Search Screen
- 검색창 (자동완성 지원)
- 검색 결과: 카테고리별 그룹핑
- 결과 탭 → 해당 계층 화면으로 이동
- 최근 검색어 표시

---

## Key User Flows

### Flow 1: 데이터 탐색 및 열람
1. 앱 실행 → 로고 애니메이션
2. Browse 탭 → 카메라 종류 리스트
3. 카메라 선택 → 렌즈군 리스트
4. 렌즈 선택 → 판형 리스트
5. 판형 선택 → 필름 종류 리스트
6. 필름 선택 → 인화지 브랜드 리스트
7. 브랜드 선택 → 인화지 종류 리스트
8. 종류 선택 → 인화지 사이즈 리스트
9. 사이즈 선택 → 인화 데이터 상세 화면

### Flow 2: 새 항목 추가
1. 임의 계층 화면에서 FAB(+) 버튼 탭
2. 이름 입력 모달 표시
3. 확인 → 리스트에 즉시 추가 (실시간 DB 반영)

### Flow 3: 항목 삭제
1. 리스트 아이템 좌측 스와이프 또는 롱프레스
2. 삭제 확인 다이얼로그
3. 확인 → 해당 항목 및 하위 데이터 모두 삭제

### Flow 4: 스마트 검색
1. Search 탭 탭
2. 검색어 입력 (카메라명, 필름명, 인화지명 등)
3. 실시간 결과 표시 (계층 경로 포함)
4. 결과 탭 → 해당 데이터 상세 화면으로 직접 이동

---

## Typography
- 헤더: Bold 24px
- 섹션 제목: SemiBold 16px
- 본문: Regular 14px
- 캡션/메타: Regular 12px, muted 색상

## Layout Principles
- 모든 화면: 다크 배경 (#0D0D0D)
- 카드/리스트 아이템: surface 배경 (#1A1A1A), rounded-xl
- 포인트 컬러: 골드 (#C8A96E) — 버튼, 아이콘, 강조 요소
- 하단 탭바: 2탭 (Browse, Search)
- 계층 탐색 시 iOS 스타일 push navigation
