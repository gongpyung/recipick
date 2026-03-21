# Step 3 Fix Review Plan — 수정 검토 계획

## 검토 목표
STEP3-FIX-PLAN.md의 6건 수정이 올바르게 적용되었는지 확인한다.

---

## Fix 1: handleCopy 에러 핸들링

- [ ] `recipe-view.tsx`의 `handleCopy`가 try/catch로 감싸져 있는가
- [ ] catch 시 사용자에게 실패 피드백이 표시되는가 (silent catch가 아닌가)
- [ ] `copyFailed` 또는 유사한 상태가 추가되었는가
- [ ] 정상 복사 시 기존 동작("복사됨!" 표시) 유지되는가

---

## Fix 2: formatDate 잘못된 날짜 방어

- [ ] `recent-recipes.tsx`의 `formatDate`에 `isNaN` 체크가 있는가
- [ ] `history-list.tsx`의 `formatDate`에 `isNaN` 체크가 있는가
- [ ] 잘못된 날짜 입력 시 '-' 또는 적절한 fallback 반환하는가
- [ ] 정상 날짜 입력 시 기존 포맷 유지되는가

---

## Fix 3: 인분 최대값 상수화

- [ ] `serving-control.tsx`에 `MAX_SERVINGS` 상수가 정의되어 있는가
- [ ] 상수 값이 20인가 (편집 폼 max="20"과 일치)
- [ ] 하드코딩된 `8`이 모두 상수로 교체되었는가
- [ ] `MIN_SERVINGS` 상수도 정의되어 있는가 (선택)
- [ ] 인분 조절 +/- 버튼이 정상 동작하는가

---

## Fix 4: 편집 폼 index key → 카운터 ID

- [ ] `recipe-edit-form.tsx`에 `useRef` 카운터 또는 유사한 ID 생성 로직이 있는가
- [ ] ingredients의 `key`가 `index`가 아닌 안정적 ID를 사용하는가
- [ ] steps의 `key`가 안정적 ID를 사용하는가
- [ ] `addIngredient`, `addStep` 시 새 ID가 생성되는가
- [ ] **`handleSave`에서 `_editId`가 API payload에서 제거되는가** (가장 중요!)
- [ ] 재료/단계 삭제 후 나머지 항목의 입력값이 유지되는가

---

## Fix 5: 하단 네비 미구현 탭 비활성화

- [ ] `bottom-nav.tsx`에 `disabled` 플래그가 추가되었는가
- [ ] 즐겨찾기, 설정 탭이 `disabled: true`인가
- [ ] disabled 탭 클릭 시 페이지 이동이 안 되는가 (홈으로 이동 안 함)
- [ ] disabled 탭에 비활성 스타일이 적용되었는가 (opacity, cursor)
- [ ] 홈, 레시피, 검색 탭은 정상 동작하는가

---

## Fix 6: useMemo 정적 문자열 제거

- [ ] `url-input-form.tsx`에서 `helperText`가 `useMemo` 없이 단순 상수인가
- [ ] 사용하지 않는 `useMemo` import가 제거되었는가 (다른 곳에서 사용 안 하는 경우)
- [ ] 화면에 helper 텍스트가 정상 표시되는가

---

## 회귀 검증

- [ ] `npm run type-check` 에러 0건
- [ ] `npm run lint` 에러 0건
- [ ] `npm run build` 성공
- [ ] `npm test` 전체 통과
- [ ] 기존 기능 정상 동작:
  - [ ] 홈 화면 표시
  - [ ] URL 입력 → 추출 진행
  - [ ] 레시피 결과 표시
  - [ ] 인분 조절 동작
  - [ ] 편집 모드 진입/저장/취소

---

## 판정 기준

| 등급 | 기준 |
|------|------|
| ✅ PASS | 6건 모두 올바르게 수정 + 회귀 없음 |
| ⚠️ CONDITIONAL | 5건 이상 수정 + Fix 4의 _editId API 제거 확인됨 |
| ❌ FAIL | Fix 4에서 _editId가 API로 전송되거나, 회귀 발생 |
