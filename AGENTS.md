<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

---

# 레시픽 (Recipick) 프로젝트 가이드

## 프로젝트 개요

YouTube 요리 영상 URL을 입력하면 AI가 자막/설명을 분석하여 구조화된 레시피(재료, 조리 순서, 팁)를 자동 추출하는 웹 애플리케이션.

**핵심 흐름:** URL 입력 → YouTube 메타데이터/자막 수집 → LLM 구조화 → Zod 스키마 검증 → Supabase 저장 → 결과 표시

## 기술 스택

| 영역 | 기술 | 버전/비고 |
|------|------|----------|
| 프레임워크 | Next.js (App Router) | 15.5.14 — `params`가 `Promise`임에 주의 |
| 언어 | TypeScript | strict mode |
| UI | Tailwind CSS v4 + shadcn/ui v4 | CVA 기반 컴포넌트 |
| 상태 관리 | SWR | 클라이언트 데이터 페칭 + 폴링 |
| 데이터베이스 | Supabase (PostgreSQL) | service role key 사용, 서버 전용 |
| AI/LLM | Z.ai API | OpenAI 호환 엔드포인트, 기본 모델 `glm-4.5-air` |
| 스키마 검증 | Zod v4 | LLM 응답 검증 + 환경변수 검증 |
| YouTube | YouTube Data API v3 + `youtube-transcript` | 메타데이터 + 자막 추출 |
| 폰트 | Gowun Batang (본문) + Jua (제목) | Google Fonts, CSS 변수 |
| E2E 테스트 | Playwright | desktop + mobile 프로젝트 |
| 단위 테스트 | Vitest | `__tests__/` 디렉토리 |

## 디렉토리 구조

```
recipick/
├── src/
│   ├── app/             # Next.js App Router 페이지 + API 라우트
│   ├── components/      # React 컴포넌트 (UI + 비즈니스)
│   └── lib/             # 핵심 비즈니스 로직 모듈
│       ├── api/         # 클라이언트 API 래퍼 + 서버 응답 헬퍼
│       ├── extraction/  # 추출 파이프라인 핵심 (서비스, 에러, 프롬프트, 스키마)
│       ├── llm/         # LLM 클라이언트 (Z.ai)
│       ├── recipe/      # 레시피 저장/조회/수정 + 인분 스케일링
│       ├── supabase/    # Supabase 클라이언트 + DB 타입
│       └── youtube/     # YouTube URL 파싱, API, 자막, 텍스트 클리닝
├── e2e/                 # Playwright E2E 테스트
├── __tests__/           # Vitest 단위 테스트
└── supabase/            # Supabase 설정
```

## 주요 명령어

```bash
npm run dev              # 개발 서버 (localhost:3000)
npm run build            # 프로덕션 빌드
npm run lint             # ESLint
npm run type-check       # TypeScript 타입 체크
npm run test             # Vitest 단위 테스트
npm run test:e2e         # Playwright E2E 테스트
npm run format           # Prettier 포맷팅
```

## 환경변수 (필수)

```
NEXT_PUBLIC_SUPABASE_URL      # Supabase 프로젝트 URL
NEXT_PUBLIC_SUPABASE_ANON_KEY # Supabase 익명 키
SUPABASE_SERVICE_ROLE_KEY     # Supabase 서비스 롤 키 (서버 전용)
YOUTUBE_API_KEY               # YouTube Data API v3 키
ZAI_API_KEY                   # Z.ai LLM API 키 (optional, 없으면 추출 불가)
ZAI_BASE_URL                  # Z.ai 엔드포인트 (기본값: https://api.z.ai/api/coding/paas/v4)
ZAI_MODEL                     # 사용할 모델명 (기본값: glm-4.5-air)
```

환경변수는 `src/lib/env.ts`에서 Zod 스키마로 검증되며, 잘못되면 서버 시작 시 에러 발생.

## 데이터베이스 스키마

6개 테이블: `videos` → `extractions` → `recipes` → `ingredients`, `steps`, `warnings`

- `videos`: YouTube 영상 메타데이터 (youtube_id unique)
- `extractions`: 추출 작업 상태 추적 (status: queued/processing/completed/failed)
- `recipes`: 구조화된 레시피 (extraction과 1:1)
- `ingredients`, `steps`, `warnings`: recipe의 자식 테이블

## 아키텍처 핵심 규칙

### 추출 파이프라인 (비동기)
1. `createExtraction()` → 즉시 `extractionId` 반환 (HTTP 202)
2. `setTimeout(0)`으로 백그라운드 파이프라인 시작
3. 6단계 진행: `validating_url` → `fetching_metadata` → `fetching_captions` → `structuring` → `normalizing` → `saving`
4. 클라이언트는 SWR 폴링 (2초 간격)으로 진행 상태 추적
5. 완료 시 자동으로 `/recipes/[id]`로 리다이렉트

### Supabase 타입 캐스팅 패턴
서비스 레이어에서 Supabase 클라이언트를 좁은 인터페이스로 캐스팅하여 사용:
```typescript
const client: unknown = getSupabaseServerClient()
return client as SupabaseSubset
```
이것은 알려진 기술 부채 (`TODO.md` 참조). 기존 패턴을 유지할 것.

### 에러 처리 계층
- `YouTubeApiError` → `LlmClientError` → `ExtractorError` → `ExtractionServiceError`
- 모든 업스트림 에러는 `mapUpstreamError()`에서 `ExtractionServiceError`로 통합
- API 응답은 `{ error, code, category }` 형태로 일관되게 반환

### LLM 스키마 재시도
LLM 응답이 Zod 스키마를 만족하지 않으면 `schema-retry`로 최대 2회 재시도. 재시도 시 이전 이슈 목록과 원본 응답을 함께 전달하여 "수리" 프롬프트 생성.

## 주의사항

- **Next.js 15 `params`**: 모든 동적 라우트에서 `params`는 `Promise`로 `await` 필요
- **서버/클라이언트 경계**: Supabase 클라이언트는 서버 전용. 브라우저에서는 `src/lib/api/client.ts`를 통해 API 라우트 호출
- **`'use client'` 지시어**: SWR, useState, useEffect 등을 사용하는 컴포넌트에 필수
- **파이프라인 타임아웃**: 90초 (`PIPELINE_TIMEOUT_MS`). LLM 응답이 느릴 수 있음
- **24시간 TTL**: 동일 영상의 완료된 추출 결과는 24시간 동안 캐시 재사용
- **`export const dynamic = 'force-dynamic'`**: 홈 페이지에 설정됨 — 최근 레시피 목록의 동적 렌더링용
- **한국어 UI**: 모든 사용자 대상 텍스트는 한국어. 에러 메시지(`errors.ts`)도 한국어
- **색상 체계**: 핑크 계열(`#f8bbd9`, `#e8a4b8`), 그린 계열(`#c8e6c9`, `#2e5f30`), 따뜻한 브라운(`#6b5b4f`, `#4a4a4a`). "귀여운 한국 앱" 디자인 컨셉
