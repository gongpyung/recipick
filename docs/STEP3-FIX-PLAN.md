# Step 3 Fix Plan — 리뷰 이슈 수정

## 개요

Step 3 프론트엔드 3단계 검토(ui-ux-pro-max + code-review + 직접 검토)에서 발견된 이슈 중, Planner-Architect-Critic 합의를 거쳐 실제 수정이 필요한 6건을 정리한 계획서.

## 수정 규칙

- 기존 기능 로직(SWR, API 호출, 타입)을 변경하지 않는다
- 디자인/스타일을 변경하지 않는다
- 수정 후 반드시 통과해야 함: `npm run type-check && npm run lint && npm run build`

---

## Fix 1: handleCopy 에러 핸들링 추가

**파일:** `src/components/recipe-view.tsx`
**심각도:** MEDIUM
**문제:** `navigator.clipboard.writeText()`가 try/catch 없이 호출됨. 클립보드 권한 거부 시 unhandled rejection 발생.

**수정 방법:**

1. `handleCopy` 함수를 try/catch로 감싼다
2. catch 시 실패 피드백을 사용자에게 보여준다 (silent catch 아님)
3. `copyFailed` 상태를 추가하여 "복사 실패" 텍스트를 1.5초 표시

**변경 전:**

```typescript
async function handleCopy() {
  await navigator.clipboard.writeText(window.location.href);
  setCopied(true);
  setTimeout(() => setCopied(false), 1500);
}
```

**변경 후:**

```typescript
const [copyFailed, setCopyFailed] = useState(false);

async function handleCopy() {
  try {
    await navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  } catch {
    setCopyFailed(true);
    setTimeout(() => setCopyFailed(false), 1500);
  }
}
```

UI에서 `copyFailed`일 때 "복사 실패" 텍스트 표시. 현재 `copied ? '복사됨!' : '링크 복사'` 부분에 `copyFailed ? '복사 실패' : ...` 조건 추가.

---

## Fix 2: formatDate 잘못된 날짜 방어

**파일 2개:**

- `src/components/recent-recipes.tsx`
- `src/components/history-list.tsx`

**심각도:** HIGH
**문제:** `new Date(value)`에 잘못된 문자열이 오면 `Invalid Date`가 렌더링됨. 특히 Server Component(`recent-recipes.tsx`)에서는 페이지 전체가 크래시할 수 있음.

**수정 방법:** 두 파일의 `formatDate` 함수에 `isNaN` 체크 추가.

**변경 전:**

```typescript
function formatDate(value: string) {
  return new Intl.DateTimeFormat('ko-KR', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));
}
```

**변경 후:**

```typescript
function formatDate(value: string) {
  const date = new Date(value);
  if (isNaN(date.getTime())) return '-';
  return new Intl.DateTimeFormat('ko-KR', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date);
}
```

---

## Fix 3: 인분 최대값 상수화 (8 → 20)

**파일:** `src/components/serving-control.tsx`
**심각도:** MEDIUM
**문제:** 인분 최대값 `8`이 하드코딩됨. 편집 폼(`recipe-edit-form.tsx`)의 `max="20"`과 불일치.

**수정 방법:**

1. 파일 상단에 상수 선언: `const MIN_SERVINGS = 1;` `const MAX_SERVINGS = 20;`
2. 코드에서 하드코딩된 `1`, `8`을 상수로 교체

**변경할 위치:**

- `targetServings <= 1` → `targetServings <= MIN_SERVINGS`
- `Math.max(1, targetServings - 1)` → `Math.max(MIN_SERVINGS, targetServings - 1)`
- `targetServings >= 8` → `targetServings >= MAX_SERVINGS`
- `Math.min(8, targetServings + 1)` → `Math.min(MAX_SERVINGS, targetServings + 1)`

---

## Fix 4: 편집 폼 index key → 카운터 ID

**파일:** `src/components/recipe-edit-form.tsx`
**심각도:** LOW
**문제:** ingredients/steps/tips 리스트에서 `key={index}` 사용. 중간 항목 삭제 시 React DOM 재조정 오류 가능.

**수정 방법:** `useRef` 카운터로 안정적 ID 부여.

1. 컴포넌트 상단에 카운터 추가:

```typescript
const nextIdRef = useRef(0);
function getNextId() {
  nextIdRef.current += 1;
  return nextIdRef.current;
}
```

2. 각 state 초기화 시 `_editId` 부여:

```typescript
const [ingredients, setIngredients] = useState(() =>
  initialData.ingredients.map((item) => ({ ...item, _editId: getNextId() })),
);
// steps, tips도 동일
```

3. `addIngredient`, `addStep`, `addTip`에서 `_editId: getNextId()` 추가

4. `key={index}` → `key={ingredient._editId}` (steps, tips도 동일)

5. **중요:** `handleSave`에서 API로 전송 시 `_editId` 필드 제거:

```typescript
ingredients: ingredients.map(({ _editId, ...rest }) => rest),
steps: steps.map(({ _editId, ...rest }) => ({ ...rest, stepNo: index + 1 })),
```

6. tips는 `string[]`이므로 `_editId`가 필요 없음. 대신 `tips.map((tip, i) => ({ text: tip, _editId: ... }))` 구조로 변경하거나, tips는 index key를 유지 (string 배열은 내용이 key 역할 가능).

---

## Fix 5: 하단 네비 미구현 탭 비활성화

**파일:** `src/components/bottom-nav.tsx`
**심각도:** MEDIUM
**문제:** 즐겨찾기, 설정 탭이 구현되지 않았는데 `href="/"`로 홈에 연결됨. 사용자 혼동.

**수정 방법:**

1. navItems에 `disabled` 플래그 추가:

```typescript
{ id: 'favorites', label: '즐겨찾기', icon: Heart, href: '/', disabled: true },
{ id: 'settings', label: '설정', icon: Settings, href: '/', disabled: true },
```

2. 렌더링에서 `disabled`인 항목은 `Link` 대신 `<div>` 또는 `<span>` 사용
3. 스타일: `opacity-40 cursor-not-allowed` 적용
4. 클릭 시 아무 동작 안 함

---

## Fix 6: useMemo 정적 문자열 제거

**파일:** `src/components/url-input-form.tsx`
**심각도:** LOW
**문제:** 정적 문자열에 불필요한 `useMemo` 래핑.

**수정 방법:**

**변경 전:**

```typescript
const helperText = useMemo(() => '요리 영상, 먹방, 레시피 영상 모두 OK!', []);
```

**변경 후:**

```typescript
const helperText = '요리 영상, 먹방, 레시피 영상 모두 OK!';
```

`useMemo` import에서 다른 곳에서 사용하지 않으면 import도 제거.

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
