# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- **추출 레시피 삭제 기능**
  - 상세 화면, 홈 최근 레시피, 히스토리 목록에서 삭제 진입점 추가
  - 공통 `RecipeDeleteButton` 컴포넌트와 삭제 확인 다이얼로그 추가
  - `DELETE /api/recipes/:id` API 추가
- **클라이언트 캐시 키 정리**
  - `cache-keys.ts`로 SWR 키를 공용 상수로 분리

### Changed

- 삭제 후 홈 최근 목록과 히스토리 목록이 SWR 캐시를 즉시 갱신하고 백그라운드 재검증하도록 개선
- 레시피 aggregate 삭제 시 연결된 extraction도 함께 정리하도록 변경
- `RECIPE_NOT_FOUND` 전용 에러 카피 추가

### Fixed

- 삭제 관련 캐시 키 하드코딩을 제거해 목록 동기화 불일치 가능성을 낮춤
- 삭제 경로에서 불필요한 중복 재검증 호출을 정리
- `deleteRecipeAggregate` 조회 범위를 필요한 필드만 가져오도록 축소
- ON DELETE CASCADE와 중복되던 일부 자식 삭제 로직 정리

## [0.1.0] - 2026-03-22

### Added

- **레시픽 MVP 출시** — YouTube 요리 영상에서 AI 레시피 추출 웹앱
- **Step 1: 데이터 파이프라인**
  - YouTube URL 파싱 (일반 영상, 쇼츠, youtu.be, 모바일)
  - YouTube Data API v3 메타데이터/자막 수집
  - 자막 언어 우선순위 (수동 > 자동, 한국어 > 영어)
  - 텍스트 정리 (타임스탬프, URL, 해시태그, 중복 제거)
  - Supabase DB 저장 (videos, extractions 테이블)
  - 24시간 TTL 캐시 (동일 영상 재추출 방지)
- **Step 2: AI 추출 엔진**
  - Z.ai GLM-5 LLM 클라이언트 (OpenAI 호환, `response_format: json_object`)
  - 추출 프롬프트 + repair 프롬프트 (스키마 실패 시 1회 재시도)
  - Zod 레시피 스키마 검증 (단일 원천)
  - 코드 기반 정규화 (단위 매핑 38개, 한국어 수사 변환)
  - 2-tier 재시도 전략 (transport retry + schema retry)
  - 비동기 파이프라인 (`setTimeout` dispatch, 90초 타임아웃)
  - 레시피 저장 (recipes, ingredients, steps, warnings 테이블)
  - 17개 에러 코드 세분화 (LLM, 스키마, YouTube, 내부 오류)
- **Step 3: 프론트엔드 핵심 화면**
  - 홈 화면 (hero 섹션 + URL 입력 + 최근 레시피)
  - 추출 진행 화면 (SWR 2초 폴링 + 6단계 타임라인)
  - 레시피 결과 화면 (재료 + 조리 단계 + 팁 + 경고)
  - 인분 조절 (1~20인분, 클라이언트 계산)
  - 클립보드 붙여넣기 UX
  - SWR 데이터 페칭 + Server Components SSR
- **Step 4: 편집 + 히스토리 + 폴리시**
  - 레시피 편집 모드 (재료/단계/팁 CRUD, PATCH API 저장)
  - 취소 확인 Dialog
  - 히스토리 페이지 (`/history`)
  - 에러 표시 (7개 에러 코드별 한국어 메시지)
  - 하단 네비게이션 (모바일 전용, 데스크톱 `md:hidden`)
  - 로딩 스켈레톤 (3개 페이지)
  - `@media print` CSS
- **UI 디자인**
  - v0.dev로 귀여운 한국 앱 스타일 생성
  - Jua (제목) + Gowun Batang (본문) 한국어 전용 폰트
  - 파스텔 핑크 (#e8a4b8) + 세이지 그린 (#c8e6c9) + 웜 베이지 (#f5e6d3) 팔레트
  - 장식 카드 레이어, 핑크 그라디언트 배경, 타임라인 연결선
- **테스트**
  - Vitest 유닛 테스트 50개 (URL 파서, API 클라이언트, 정규화, 스키마 등)
  - Playwright E2E 테스트 44개 (데스크톱 22 + 모바일 22)
  - API 모킹 헬퍼 (route interception)
- **API 엔드포인트 5개**
  - `POST /api/extractions` — 추출 작업 생성
  - `GET /api/extractions/:id` — 추출 상태 조회
  - `GET /api/recipes/:id` — 레시피 상세 조회
  - `PATCH /api/recipes/:id` — 레시피 수정
  - `GET /api/recipes?scope=recent` — 최근 레시피 목록
- **브랜딩**
  - 서비스명: 레시픽 (Recipick)
  - 슬로건: "당신이 본 요리 영상, 스마트하게 픽하다"
- **프로젝트 문서화**
  - CLAUDE.md — Claude 작업 가이드
  - AGENTS.md — 계층적 코드베이스 가이드 (5개 파일)
  - TODO.md — 작업 체크리스트
  - docs/ — PRD, 스키마, API 계약, 구현 계획서, 검토 결과

### Fixed

- 재료명 한 글자씩 줄바꿈 → `break-keep` + `flex-1` 적용
- `handleCopy` clipboard 에러 핸들링 추가 (실패 시 "복사 실패" 피드백)
- `formatDate` invalid date 방어 (`isNaN` 체크)
- 인분 최대값 하드코딩 `8` → `MAX_SERVINGS = 20` 상수화
- 편집 폼 `index` key → `useRef` 카운터 기반 안정적 ID
- 하단 네비 미구현 탭 비활성화 (`role="button"` + `aria-disabled`)
- `useMemo` 정적 문자열 불필요한 래핑 제거
- SWR `error` 미처리 → `ErrorDisplay` 컴포넌트 재사용
- servings 저장 전 `> 0` 클라이언트 검증 추가
- 로딩 스켈레톤 레이아웃 실제 페이지와 일치
- LLM 타임아웃 25초 → 90초 변경 (glm-5 응답 시간 대응)
- `warning.code` 내부 시스템 코드 UI 노출 제거

### Changed

- 폴더명 `youtube-recipe-ai` → `recipick`
- 데스크톱에서 하단 네비 숨기기 (`md:hidden`)
- 레시피/히스토리 페이지 데스크톱 너비 확장 (`lg:max-w-4xl`)
- hero 섹션 모바일 하단 패딩 증가 (`pb-24`)
