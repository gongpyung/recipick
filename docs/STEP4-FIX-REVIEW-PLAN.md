# Step 4 Fix Review Plan — 수정 검토 계획

## 검토 목표
STEP4-FIX-PLAN.md의 4건 수정이 올바르게 적용되었는지 확인한다.

---

## Fix 1: SWR 에러 처리 — history-list.tsx

- [ ] `useSWR`에서 `error`와 `mutate`가 destructure되는가
- [ ] `isLoading` 분기 다음에 `error` 분기가 있는가
- [ ] 에러 시 `ErrorDisplay` 컴포넌트가 재사용되는가 (인라인 div 아님)
- [ ] `onRetry`로 `mutate()`가 전달되는가
- [ ] `ErrorDisplay` import가 추가되었는가
- [ ] 정상 동작 시 기존 빈 상태 UI가 유지되는가

---

## Fix 2: servings 저장 전 검증 — recipe-edit-form.tsx

- [ ] `handleSave` 시작 부분에 servings 검증이 있는가
- [ ] 조건이 `n <= 0` 또는 `Number.isNaN(n)`인가
- [ ] **`Number.isInteger()` 사용하지 않는가** (소수점 허용해야 함)
- [ ] 검증 실패 시 에러 메시지가 표시되는가
- [ ] 검증 실패 시 API 호출이 차단되는가 (`return` 처리)
- [ ] 빈 값(null) 입력은 허용되는가 (인분 미지정)

---

## Fix 3: disabled nav 접근성 — bottom-nav.tsx

- [ ] disabled 항목에 `role="button"`이 있는가 (**`role="link"` 아님!**)
- [ ] `aria-disabled="true"` 유지되는가
- [ ] `aria-label`에 "(준비 중)" 같은 설명이 포함되는가
- [ ] `tabIndex={-1}`이 추가되었는가 (포커스 제외)
- [ ] 활성 탭(홈, 레시피, 검색)은 기존 동작 유지하는가

---

## Fix 4: 로딩 스켈레톤 레이아웃 일치

### history/loading.tsx
- [ ] `max-w-lg` 사용 (실제 페이지와 일치)
- [ ] `pb-24` 사용 (BottomNav 공간)
- [ ] 그라디언트 배경 적용
- [ ] 스켈레톤이 실제 카드 그리드 형태와 유사

### recipes/[id]/loading.tsx
- [ ] `max-w-2xl` 사용 (실제 페이지와 일치)
- [ ] `pb-28` 사용
- [ ] 2컬럼 그리드 스켈레톤 (재료 + 단계)
- [ ] 헤더 카드 + 인분 조절 스켈레톤 포함

### app/loading.tsx
- [ ] `pb-24` 사용
- [ ] hero 영역 스켈레톤
- [ ] 최근 레시피 스켈레톤

---

## 회귀 검증

- [ ] `npm run type-check` 에러 0건
- [ ] `npm run lint` 에러 0건
- [ ] `npm run build` 성공
- [ ] `npm test` 전체 통과
- [ ] 기존 기능:
  - [ ] 홈 화면 정상
  - [ ] 히스토리 페이지 정상 (빈 상태 + 목록)
  - [ ] 레시피 결과 화면 정상
  - [ ] 편집 저장 정상
  - [ ] 하단 네비 활성 탭 정상

---

## 판정 기준

| 등급 | 기준 |
|------|------|
| ✅ PASS | 4건 모두 올바르게 수정 + 회귀 없음 |
| ⚠️ CONDITIONAL | 3건 이상 수정 + Fix 3에서 role="link" 아닌 role="button" 확인 |
| ❌ FAIL | Fix 1 미적용 또는 회귀 발생 |
