# src/components/ -- UI 컴포넌트 가이드

## 개요

레시픽 애플리케이션의 모든 React 컴포넌트가 이 디렉토리에 위치한다. `ui/` 하위 디렉토리에는 shadcn/ui v4 기반 공통 컴포넌트가, 루트에는 비즈니스 로직이 포함된 앱 컴포넌트가 있다.

---

## 서버 컴포넌트 vs 클라이언트 컴포넌트

| 컴포넌트 | 타입 | 이유 |
|----------|------|------|
| `recent-recipes.tsx` | **Server Component** | Supabase 직접 조회, SSR 렌더링 |
| 그 외 모든 컴포넌트 | **Client Component** (`'use client'`) | SWR, useState, useRouter 등 사용 |

**중요**: `recent-recipes.tsx`는 유일한 서버 컴포넌트이며, `src/lib/recipe/service.ts`를 직접 import한다. 다른 컴포넌트들은 `src/lib/api/client.ts`를 통해 API 라우트를 호출한다.

---

## 앱 컴포넌트 상세

### `url-input-form.tsx` -- URL 입력 폼

**역할**: 홈 페이지의 YouTube URL 입력 + 추출 요청 시작

**핵심 동작**:
1. 클라이언트 측에서 `parseYouTubeUrl()`로 URL 검증 (서버 요청 없이)
2. 유효하면 `createExtraction()` API 호출
3. 성공 시 `router.push(/extractions/${id})` 리다이렉트
4. 클립보드에 YouTube URL이 있으면 "붙여넣기" 제안 표시

**상태**:
- `value`: 입력값
- `error`: 에러 메시지 (null이면 숨김)
- `isSubmitting`: 제출 중 로딩 상태
- `clipboardValue`: 클립보드 제안 URL

### `extraction-progress.tsx` -- 추출 진행 표시

**역할**: 6단계 추출 파이프라인 진행 상태를 타임라인으로 표시

**핵심 동작**:
1. SWR로 `/api/extractions/${id}` 폴링 (2초 간격)
2. `status`가 `completed`이면 자동으로 `/recipes/${recipeId}`로 리다이렉트
3. `status`가 `failed`이면 `ErrorDisplay` 표시
4. 진행 중이면 현재 단계에 스피너, 완료 단계에 체크, 미진행 단계에 아이콘 표시

**6단계 정의**:
```
validating_url → fetching_metadata → fetching_captions → structuring → normalizing → saving
```

**SWR 설정**: `refreshInterval`은 완료/실패 시 0 (폴링 중단), 그 외 2000ms.

### `recipe-view.tsx` -- 레시피 결과 뷰어

**역할**: 추출된 레시피의 전체 화면 (재료, 조리 순서, 팁, 경고, 액션 버튼)

**핵심 기능**:
- SWR로 레시피 데이터 로드
- 인분 조절 (`ServingControl` 연동, `scaleIngredient()` 호출)
- 편집 모드 전환 (`RecipeEditForm` 표시)
- 링크 복사 (Clipboard API)
- 원본 YouTube 영상 링크

**내부 컴포넌트**:
- `ConfidenceBadge`: confidence가 `high`가 아닌 항목에 뱃지 표시
- `SeverityIcon`: 경고 심각도별 아이콘 (error/warning/info)

**스케일링 로직**: `useMemo`로 `scaledIngredients` 계산. `targetServings` 변경 시에만 재계산.

### `recipe-edit-form.tsx` -- 레시피 편집 폼

**역할**: 레시피 제목, 인분, 재료, 단계, 팁을 편집하고 저장

**핵심 동작**:
1. `initialData`로 폼 초기화
2. 재료/단계를 동적 추가/삭제 가능
3. 저장 시 `updateRecipe()` API 호출
4. 성공 시 `onSaved()` 콜백 (편집 모드 종료 + SWR mutate)
5. 저장 전 확인 다이얼로그 표시

**의존 UI**: `Dialog`, `Input`, `Textarea`, `Label`, `Button` (shadcn/ui)

### `serving-control.tsx` -- 인분 조절

**역할**: 인분 수 +/- 버튼과 현재 인분 표시

**규칙**:
- `baseServings === null`이면 "인분 정보 없음" 안내 카드 표시 (조절 불가)
- 최소 1인분, 최대 20인분
- 현재 인분은 그라데이션 박스로 강조

### `error-display.tsx` -- 에러 표시

**역할**: 에러 코드에 따른 한국어 안내 메시지 + 재시도/홈 버튼

**에러 코드별 UI**:
| 코드 | 제목 | 재시도 가능 |
|------|------|-----------|
| `INVALID_URL` | 유효한 유튜브 URL이 아닙니다 | X |
| `VIDEO_NOT_FOUND` | 영상을 찾을 수 없습니다 | X |
| `NON_RECIPE_VIDEO` | 레시피 영상이 아닙니다 | X |
| `LLM_REQUEST_FAILED` | AI 처리 중 오류 | O |
| `INTERNAL_ERROR` | 서버 오류 | O |

미등록 코드는 "오류가 발생했습니다" 폴백.

### `recent-recipes.tsx` -- 최근 레시피 (서버 컴포넌트)

**역할**: 홈 페이지 하단의 최근 레시피 목록 (최대 5개)

**서버 컴포넌트**: `async function RecentRecipes()`로 선언. `listRecentRecipes()`를 직접 호출.

**썸네일 없는 경우**: 색상 배경 + 음식 이모지 (순환 배열)

### `history-list.tsx` -- 이력 목록 (클라이언트 컴포넌트)

**역할**: `/history` 페이지의 전체 레시피 이력 (그리드 카드 레이아웃)

**차이점**: `recent-recipes.tsx`와 달리 클라이언트 컴포넌트. SWR로 `getRecentRecipes()` API 호출. 로딩/에러 상태 처리 포함.

### `header.tsx` -- 앱 헤더

**역할**: sticky 헤더 (로고 + "최근 레시피" 네비게이션 링크)
- 현재 경로에 따라 활성 링크 스타일 변경
- 블러 배경 (`backdrop-blur-lg`)

### `bottom-nav.tsx` -- 하단 네비게이션 (모바일)

**역할**: 모바일 전용 (`md:hidden`) 하단 고정 네비게이션 바

**탭 구성**:
| 탭 | 링크 | 상태 |
|----|------|------|
| 홈 | `/` | 활성 |
| 레시피 | `/history` | 활성 |
| 검색 | `/` | 중앙 주요 버튼 (그라데이션) |
| 즐겨찾기 | - | 비활성 (`disabled: true`, 준비 중) |
| 설정 | - | 비활성 (`disabled: true`, 준비 중) |

---

## ui/ -- shadcn/ui v4 기본 컴포넌트

shadcn/ui v4에서 생성된 공통 UI 컴포넌트. `@base-ui/react` 기반.

| 파일 | 설명 |
|------|------|
| `alert.tsx` | 알림 박스 |
| `badge.tsx` | 뱃지 |
| `button.tsx` | 버튼 (variant: default, ghost, outline + nativeButton/render 지원) |
| `card.tsx` | 카드 컨테이너 |
| `dialog.tsx` | 다이얼로그/모달 |
| `input.tsx` | 텍스트 입력 |
| `label.tsx` | 라벨 |
| `separator.tsx` | 구분선 |
| `skeleton.tsx` | 스켈레톤 로더 |
| `textarea.tsx` | 텍스트 영역 |

**주의**: shadcn/ui v4는 `@base-ui/react` 기반으로, v3까지의 Radix UI와 다르다. Button 컴포넌트에 `nativeButton` prop과 `render` prop이 있으며, Radix의 `asChild`와 다른 패턴.

---

## 디자인 규칙

### 색상 팔레트

- **Primary 핑크**: `#f8bbd9`, `#e8a4b8`, `#fce4ec`, `#ad1457`
- **Secondary 그린**: `#c8e6c9`, `#2e5f30`, `#a5d6a7`
- **Accent 앰버**: `#ffe0b2`, `#e65100`, `#ffcdd2`
- **텍스트**: `#4a4a4a` (제목), `#6b5b4f` (중간), `#8b7b7b` (보조)
- **배경**: `#fef7f9`, `#fff8e1`

### 카드 레이아웃 패턴

모든 주요 카드는 "장식적 겹침 카드" 패턴을 사용:
```jsx
<div className="relative">
  <div className="absolute -top-1 left-2 right-2 h-full bg-[색상]/30 rounded-3xl" />
  <div className="relative bg-white rounded-3xl p-5 shadow-xl border border-[색상]/30">
    {/* 실제 내용 */}
  </div>
</div>
```

### 라운딩

- 카드: `rounded-3xl` (24px)
- 버튼/입력: `rounded-2xl` (16px)
- 아이콘 컨테이너: `rounded-xl` (12px) 또는 `rounded-full`
- 뱃지: `rounded-md` 또는 `rounded-full`

### 폰트

- `font-display` (Jua): 제목, 브랜딩 텍스트
- `font-body` (Gowun Batang): 본문, 설명

### 반응형

- 모바일: 단일 컬럼, `pb-24` (하단 네비 여백)
- 태블릿/데스크톱: 그리드 레이아웃 (`lg:grid-cols-[1fr_1.3fr]`)
- 하단 네비: `md:hidden` (데스크톱에서 숨김)

### 인쇄

- `no-print` 클래스: 인쇄 시 숨김 (네비, 액션 버튼)
- `print-full` 클래스: 인쇄 시 전체 너비

---

## 흔한 실수

1. **서버 컴포넌트에서 SWR/useState 사용 불가**: `recent-recipes.tsx`만 서버 컴포넌트. 상태/훅 필요 시 `'use client'` 지시어 추가
2. **`src/lib/recipe/service.ts`를 클라이언트 컴포넌트에서 import하지 말 것**: 빌드 에러 발생. `src/lib/api/client.ts` 사용
3. **shadcn/ui v4의 Button**: `asChild` 대신 `nativeButton={false}` + `render={<Link />}` 패턴 사용 (ErrorDisplay 참조)
4. **에러 코드 추가 시**: `error-display.tsx`의 `ERROR_COPY` 객체에도 한국어 복사본 추가 필요
5. **색상 하드코딩**: CSS 변수 대신 직접 색상 코드 사용 중. 새 컴포넌트에서도 동일 패턴 유지
