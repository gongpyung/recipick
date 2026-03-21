<div align="center">

# 🍳 레시픽 (Recipick)

**당신이 본 요리 영상, 스마트하게 픽하다**

[![Next.js](https://img.shields.io/badge/Next.js-15-000000?style=for-the-badge&logo=nextdotjs)](https://nextjs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?style=for-the-badge&logo=typescript)](https://www.typescriptlang.org)
[![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL-3FCF8E?style=for-the-badge&logo=supabase)](https://supabase.com)
[![License](https://img.shields.io/badge/License-MIT-green?style=for-the-badge)](LICENSE)

</div>

---

## 🎯 소개

**레시픽(Recipick)**은 YouTube 요리 영상 URL을 입력하면 AI가 자동으로 레시피를 추출해주는 웹앱입니다.

- 🎬 **영상 · 쇼츠 지원** — YouTube 일반 영상과 Shorts 링크를 모두 분석
- 🤖 **AI 자동 추출** — 자막과 설명을 분석해 재료·조리 단계를 자동 구조화
- ⚖️ **인분 조절** — 인분 수를 바꾸면 재료량이 자동으로 계산
- ✏️ **레시피 편집** — AI 추출 결과를 직접 수정하고 저장
- 📱 **귀여운 한국 앱 디자인** — 파스텔 핑크/베이지/세이지 그린 팔레트

---

## ✨ 주요 기능

<table>
<tr>
<td width="50%">

### 🔗 URL 입력 → 레시피 추출
YouTube 링크 하나만 붙여넣으면 AI가 자막과 설명을 분석해 재료, 조리 순서, 팁까지 깔끔하게 정리

</td>
<td width="50%">

### ⚖️ 인분 조절
1~20인분까지 조절하면 재료량이 자동 계산. 비정형 표현(적당량, 약간)은 그대로 유지

</td>
</tr>
<tr>
<td width="50%">

### ✏️ 레시피 편집
AI 추출 결과가 마음에 안 들면 직접 수정 가능. 재료/단계/팁 추가·삭제·수정

</td>
<td width="50%">

### 📋 추출 이력
최근 추출한 레시피를 한눈에 확인하고 다시 열기

</td>
</tr>
</table>

---

## 🚀 빠른 시작

### 사전 준비

- Node.js 20+
- [Supabase](https://supabase.com) 프로젝트 (Free tier)
- [YouTube Data API v3](https://console.cloud.google.com) 키
- [Z.ai](https://z.ai) API 키 (GLM 코딩 플랜)

### 설치 및 실행

```bash
# 저장소 클론
git clone https://github.com/gongpyung/recipick.git
cd recipick

# 의존성 설치
npm install

# 환경변수 설정
cp .env.example .env.local
# .env.local 파일을 편집하여 API 키 입력

# Supabase 테이블 생성
# Supabase Dashboard > SQL Editor에서 아래 파일 실행:
# supabase/migrations/001_initial_schema.sql
# supabase/migrations/002_recipe_tables.sql

# 개발 서버 실행
npm run dev
```

브라우저에서 http://localhost:3000 접속

### 환경변수 (.env.local)

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://<project>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon-key>
SUPABASE_SERVICE_ROLE_KEY=<service-role-key>

# YouTube Data API v3
YOUTUBE_API_KEY=<google-api-key>

# Z.ai LLM (선택 — 없으면 추출 불가)
ZAI_API_KEY=<z-ai-key>
ZAI_BASE_URL=https://api.z.ai/api/coding/paas/v4
ZAI_MODEL=glm-5
```

---

## 📁 프로젝트 구조

```
recipick/
├── 📂 src/
│   ├── app/                    # Next.js App Router 페이지 + API
│   │   ├── api/extractions/    # POST 추출 생성, GET 상태 조회
│   │   ├── api/recipes/        # GET/PATCH 레시피 CRUD
│   │   ├── extractions/[id]/   # 추출 진행 페이지
│   │   ├── recipes/[id]/       # 레시피 결과 + 편집
│   │   └── history/            # 추출 이력
│   ├── components/             # React 컴포넌트
│   │   ├── ui/                 # shadcn/ui 기본 컴포넌트
│   │   ├── recipe-view.tsx     # 레시피 뷰어 (인분 조절 포함)
│   │   ├── recipe-edit-form.tsx# 레시피 편집 폼
│   │   └── extraction-progress.tsx # 추출 진행 타임라인
│   └── lib/                    # 핵심 비즈니스 로직
│       ├── extraction/         # 추출 파이프라인 (서비스, 프롬프트, 스키마)
│       ├── llm/                # Z.ai LLM 클라이언트
│       ├── recipe/             # 레시피 저장/조회/스케일링
│       ├── youtube/            # YouTube URL 파싱, API, 자막
│       └── supabase/           # Supabase 클라이언트 + DB 타입
├── 📂 e2e/                     # Playwright E2E 테스트
├── 📂 __tests__/               # Vitest 단위 테스트
├── 📂 supabase/migrations/     # DB 마이그레이션 SQL
└── 📂 docs/                    # 설계 문서 (PRD, 스키마, API)
```

---

## 🔧 기술 스택

| 영역 | 기술 |
|------|------|
| **Framework** | Next.js 15 (App Router), React 19 |
| **Language** | TypeScript 5 (strict) |
| **Styling** | Tailwind CSS v4, shadcn/ui v4 (@base-ui/react) |
| **Database** | Supabase (PostgreSQL) |
| **AI/LLM** | Z.ai API (GLM-5, OpenAI 호환) |
| **Data Fetching** | SWR v2 (클라이언트), Server Components (SSR) |
| **Validation** | Zod v4 |
| **Unit Test** | Vitest (50개 테스트) |
| **E2E Test** | Playwright (44개 테스트, 데스크톱+모바일) |
| **Font** | Jua (제목) + Gowun Batang (본문) |

---

## 🍳 추출 파이프라인

```
YouTube URL 입력
  → URL 파싱 + 유효성 검사
  → 24시간 캐시 확인 (기존 결과 재사용)
  → 메타데이터 수집 (YouTube Data API v3)
  → 자막 수집 (수동 > 자동, 한국어 > 영어)
  → 텍스트 정리 (타임스탬프/URL/해시태그 제거)
  → AI 구조화 (Z.ai LLM, response_format: json_object)
  → 스키마 검증 (Zod, 실패 시 repair prompt로 1회 재시도)
  → 정규화 (단위 매핑 38개, 한국어 수사 변환)
  → DB 저장 (recipes + ingredients + steps + warnings)
  → 완료!
```

---

## 📝 명령어

```bash
npm run dev              # 개발 서버
npm run build            # 프로덕션 빌드
npm run test             # 유닛 테스트
npm run test:e2e         # E2E 테스트
npm run test:e2e:ui      # E2E 테스트 (UI 모드)
npm run type-check       # TypeScript 타입 체크
npm run lint             # ESLint
npm run format           # Prettier
```

---

## 🤝 기여하기

기여를 환영합니다!

1. 🐛 **버그 리포트** — Issue 열기
2. 💡 **기능 제안** — 새 기능 요청
3. 🔧 **코드 기여** — Pull Request
4. 🎨 **디자인 개선** — UI/UX 피드백

---

## 📄 라이선스

MIT License © 2026

---

<div align="center">

**레시픽 (Recipick)** — 당신이 본 요리 영상, 스마트하게 픽하다 🍳

</div>
