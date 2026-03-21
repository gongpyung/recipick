# Step 4 Fix Plan — 리뷰 이슈 수정

## 개요
Step 4 프론트엔드 3단계 검토에서 발견된 이슈 중, Planner-Architect-Critic 합의를 거쳐 수정이 필요한 4건.

## 수정 규칙
- 기존 기능 로직을 변경하지 않는다
- 디자인/스타일을 변경하지 않는다
- 수정 후 반드시 통과: `npm run type-check && npm run lint && npm run build`

---

## Fix 1: SWR 에러 처리 — history-list.tsx

**파일:** `src/components/history-list.tsx`
**심각도:** MEDIUM
**문제:** `useSWR`에서 `error`를 destructure하지 않음. API 실패 시 "아직 레시피가 없어요" 빈 상태가 표시되어 네트워크 오류와 실제 빈 목록을 구분할 수 없음.

**수정 방법:**
1. `useSWR`에서 `error`, `mutate` 추가 destructure
2. `isLoading` 분기 다음에 `error` 분기 추가
3. 기존 `ErrorDisplay` 컴포넌트를 재사용 (새 에러 UI 만들지 않음)

**변경 전:**
```typescript
const { data, isLoading } = useSWR('recent-recipes-full', () =>
  getRecentRecipes(),
);
```

**변경 후:**
```typescript
const { data, isLoading, error, mutate } = useSWR('recent-recipes-full', () =>
  getRecentRecipes(),
);
```

isLoading 분기 다음, items 체크 전에 추가:
```typescript
if (error) {
  return (
    <ErrorDisplay
      code={'code' in error ? String(error.code) : 'INTERNAL_ERROR'}
      message={error instanceof Error ? error.message : undefined}
      onRetry={() => void mutate()}
    />
  );
}
```

`ErrorDisplay` import 추가:
```typescript
import { ErrorDisplay } from '@/components/error-display';
```

---

## Fix 2: servings 저장 전 검증 — recipe-edit-form.tsx

**파일:** `src/components/recipe-edit-form.tsx`
**심각도:** MEDIUM
**문제:** `handleSave()`에서 servings를 `Number()`로 변환만 하고, 0 이하 값에 대한 검증 없음.

**수정 방법:** `handleSave()` 시작 부분에 검증 추가. 소수점은 허용하되 0 이하만 차단.

**변경 전 (handleSave 시작):**
```typescript
async function handleSave() {
  setError(null);
  setIsSaving(true);
  try {
    const servingsNum = baseServings ? Number(baseServings) : null;
```

**변경 후:**
```typescript
async function handleSave() {
  setError(null);

  if (baseServings) {
    const n = Number(baseServings);
    if (Number.isNaN(n) || n <= 0) {
      setError('인분 수는 0보다 커야 합니다.');
      return;
    }
  }

  setIsSaving(true);
  try {
    const servingsNum = baseServings ? Number(baseServings) : null;
```

**주의:** `Number.isInteger()` 사용하지 않음. 소수점 인분(예: 1.5인분)은 유효한 입력으로 허용.

---

## Fix 3: disabled nav 접근성 개선 — bottom-nav.tsx

**파일:** `src/components/bottom-nav.tsx`
**심각도:** MEDIUM
**문제:** disabled 네비게이션 항목이 `<div>`로 렌더링되지만 `role` 속성 없음. 스크린 리더가 비활성 네비게이션 항목임을 인식 못함.

**수정 방법:** disabled 항목의 `<div>`에 접근성 속성 추가.

**변경 전:**
```tsx
<div
  key={item.id}
  aria-disabled="true"
  className="flex min-w-[48px] cursor-not-allowed flex-col items-center gap-1 py-1 opacity-40"
>
```

**변경 후:**
```tsx
<div
  key={item.id}
  role="button"
  aria-disabled="true"
  aria-label={`${item.label} (준비 중)`}
  tabIndex={-1}
  className="flex min-w-[48px] cursor-not-allowed flex-col items-center gap-1 py-1 opacity-40"
>
```

**주의:** `role="link"` 아님! `role="button"`이 의미론적으로 올바름 (비활성 항목은 이동 기능이 없으므로).

---

## Fix 4: 로딩 스켈레톤 레이아웃 일치

**파일 3개:**
- `src/app/loading.tsx`
- `src/app/recipes/[id]/loading.tsx`
- `src/app/history/loading.tsx`

**심각도:** LOW
**문제:** 스켈레톤 레이아웃이 실제 페이지 레이아웃과 불일치. CLS(Cumulative Layout Shift) 발생 가능.

**수정 방법:** 각 loading.tsx의 레이아웃을 실제 페이지와 일치시킴.

### `src/app/history/loading.tsx`
실제 페이지 (`history/page.tsx`)의 레이아웃: `max-w-lg`, `pb-24`, `px-4`, `py-6`

```tsx
export default function HistoryLoading() {
  return (
    <main className="flex-1 pb-24 min-h-screen bg-gradient-to-b from-[#fce4ec] via-[#fef7f9] to-[#fff8e1]">
      <div className="relative mx-auto w-full max-w-lg px-4 py-6 space-y-6">
        {/* Header skeleton */}
        <div>
          <Skeleton className="h-7 w-36 rounded-lg" />
          <Skeleton className="h-4 w-64 mt-1 rounded-lg" />
        </div>
        {/* Card skeleton */}
        <div className="bg-white rounded-3xl p-5 shadow-xl shadow-[#f8bbd9]/20 border border-[#f8bbd9]/30">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="bg-[#fef7f9] rounded-2xl overflow-hidden">
                <Skeleton className="h-32 w-full" />
                <div className="p-3 space-y-2">
                  <Skeleton className="h-4 w-3/4 rounded-md" />
                  <Skeleton className="h-3 w-1/3 rounded-md" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </main>
  );
}
```

### `src/app/recipes/[id]/loading.tsx`
실제 페이지: `max-w-2xl`, `pb-28`, `px-4`, `py-6`

```tsx
export default function RecipeLoading() {
  return (
    <main className="flex-1 pb-28 min-h-screen bg-gradient-to-b from-[#fce4ec] via-[#fef7f9] to-[#fff8e1]">
      <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">
        {/* Header card skeleton */}
        <div className="bg-white rounded-3xl p-5 shadow-xl shadow-[#f8bbd9]/20 border border-[#f8bbd9]/30">
          <Skeleton className="h-8 w-2/3 mx-auto rounded-lg" />
          <Skeleton className="h-5 w-1/3 mx-auto mt-2 rounded-lg" />
        </div>
        {/* Serving control skeleton */}
        <Skeleton className="h-16 w-full rounded-2xl" />
        {/* Two column skeleton */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="bg-white rounded-3xl p-4 shadow-xl shadow-[#c8e6c9]/20 border border-[#c8e6c9]/30">
            <Skeleton className="h-6 w-16 rounded-lg mb-4" />
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-10 w-full rounded-lg" />
              ))}
            </div>
          </div>
          <div className="bg-white rounded-3xl p-4 shadow-xl shadow-[#f8bbd9]/20 border border-[#f8bbd9]/30">
            <Skeleton className="h-6 w-20 rounded-lg mb-4" />
            <div className="space-y-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-16 w-full rounded-2xl" />
              ))}
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
```

### `src/app/loading.tsx`
실제 홈 페이지: `pb-24`, hero 영역 + 최근 레시피

```tsx
export default function Loading() {
  return (
    <main className="flex-1 pb-24">
      {/* Hero skeleton */}
      <section className="hero-bg border-b border-[#f8bbd9]/20 px-6 pb-16 pt-14">
        <div className="mx-auto max-w-2xl space-y-8 text-center">
          <Skeleton className="h-12 w-2/3 mx-auto rounded-xl" />
          <Skeleton className="h-6 w-1/2 mx-auto rounded-lg" />
          <Skeleton className="h-14 w-full max-w-lg mx-auto rounded-3xl" />
        </div>
      </section>
      {/* Recent recipes skeleton */}
      <section className="px-6 py-14">
        <div className="mx-auto max-w-6xl space-y-8">
          <Skeleton className="h-8 w-48 rounded-lg" />
          <div className="bg-white rounded-3xl p-4 shadow-xl shadow-[#f8bbd9]/20 border border-[#f8bbd9]/30">
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-16 w-full rounded-2xl" />
              ))}
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
```

---

## 검증

수정 완료 후 반드시 실행:
```bash
npm run type-check
npm run lint
npm run build
npm test
```

모두 통과해야 함.
