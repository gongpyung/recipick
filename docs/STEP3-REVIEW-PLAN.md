# Step 3 Review Plan — 핵심 화면 (홈, 진행, 결과)

## 검토 목표

Step 3 프론트엔드 핵심 화면이 계획대로 구현되었는지 확인한다.
핵심 검증: URL 입력 → 추출 진행 → 레시피 결과 표시 + 인분 조절

---

## 1. 구조 검토

### 1-1. 파일 구조

- [ ] `src/app/page.tsx` 수정됨 (홈 화면)
- [ ] `src/app/layout.tsx` 수정됨 (Header 포함)
- [ ] `src/app/extractions/[id]/page.tsx` 존재
- [ ] `src/app/recipes/[id]/page.tsx` 존재
- [ ] `src/components/header.tsx` 존재
- [ ] `src/components/url-input-form.tsx` 존재
- [ ] `src/components/extraction-progress.tsx` 존재
- [ ] `src/components/recipe-view.tsx` 존재
- [ ] `src/components/serving-control.tsx` 존재
- [ ] `src/lib/api/client.ts` 존재
- [ ] `src/lib/recipe/scaling.ts` 존재

### 1-2. 의존성

- [ ] `swr` 설치됨 (package.json)
- [ ] shadcn/ui 컴포넌트 추가됨 (input, card, badge 등)

### 1-3. 타입

- [ ] 프론트엔드 전용 타입 파일이 **없는지** 확인 (기존 타입 재사용)
- [ ] `src/lib/extraction/types.ts`에서 import하고 있는지

---

## 2. 기능 검토

### 2-1. 홈 화면 (Screen A)

```
테스트:
- [ ] URL 입력창이 표시되는가
- [ ] "레시피 추출하기" 버튼이 있는가
- [ ] 유효한 YouTube URL 입력 → /extractions/[id]로 이동하는가
- [ ] 잘못된 URL → 인라인 에러 메시지 표시
- [ ] 빈 입력 → 에러 메시지
- [ ] 최근 레시피 목록이 표시되는가 (있을 경우)
- [ ] 최근 레시피 클릭 → /recipes/[id]로 이동
- [ ] 클립보드에 YouTube URL 있을 때 자동 제안 동작
- [ ] 로딩 중 버튼 비활성화
```

### 2-2. 추출 진행 화면 (Screen B)

```
테스트:
- [ ] SWR로 2초 간격 폴링 동작
- [ ] 단계별 진행 표시 (한글 라벨)
- [ ] 현재 단계 애니메이션/로딩 표시
- [ ] completed → /recipes/[recipeId]로 자동 이동
- [ ] failed → 에러 메시지 표시
- [ ] failed → "다시 시도하기" 버튼 동작
- [ ] 폴링이 completed/failed 시 자동 중단되는지
```

### 2-3. 레시피 결과 화면 (Screen C)

```
테스트:
- [ ] 레시피 제목 표시
- [ ] 원본 영상 링크 표시
- [ ] 재료 목록 표시 (name, amount, unit)
- [ ] 조리 단계 표시 (stepNo 순서)
- [ ] 팁 섹션 표시
- [ ] 경고 박스 표시 (severity별 색상 구분)
- [ ] confidence 'low' 재료 시각적 구분
- [ ] note가 있는 재료 표시
- [ ] "수정하기" 버튼 존재 (Step 4에서 연결)
- [ ] "링크 복사" 버튼 동작
```

### 2-4. 인분 조절

```
테스트:
- [ ] 1~8 인분 조절 컨트롤 동작
- [ ] 인분 변경 시 재료 수량 실시간 변경
- [ ] scalable=false 재료 → 수량 변경 안 됨
- [ ] amount=null 재료 → 수량 변경 안 됨
- [ ] baseServings=null → 인분 조절 비활성화 + 안내 표시
- [ ] 소수점 결과 적절히 표시 (0.5 등)
```

---

## 3. 코드 품질

- [ ] `npm run type-check` 에러 0건
- [ ] `npm run lint` 에러 0건
- [ ] `npm test` 전체 통과
- [ ] `npm run build` 성공
- [ ] Server/Client 컴포넌트 분리 적절한지
  - 'use client' 필요한 곳에만 사용
- [ ] SWR 사용 패턴 올바른지 (Client Component에서만)

---

## 4. 인분 조절 유닛 테스트

- [ ] `__tests__/lib/recipe/scaling.test.ts` 존재
- [ ] 정상 스케일링 테스트
- [ ] null amount 테스트
- [ ] scalable false 테스트
- [ ] baseServings null 테스트
- [ ] 소수점 결과 테스트

---

## 5. 반응형 기본 확인

- [ ] 모바일 (375px): 단일 컬럼 레이아웃
- [ ] 데스크톱 (1024px+): 2컬럼 (재료 왼쪽, 단계 오른쪽)
- [ ] URL 입력창 모바일에서 사용 편의

---

## 6. E2E Smoke Test

### Test Case 1: 전체 플로우

```
1. 홈 화면에서 YouTube URL 입력
2. 추출 진행 화면에서 단계 전환 확인
3. 완료 후 레시피 결과 화면 이동
4. 인분 조절 → 재료 수량 변경 확인
```

### Test Case 2: 에러 케이스

```
1. 잘못된 URL 입력 → 인라인 에러
2. 존재하지 않는 영상 → failed 화면
```

---

## 판정 기준

| 등급           | 기준                                                     |
| -------------- | -------------------------------------------------------- |
| ✅ PASS        | 전체 플로우 동작 + 인분 조절 + 반응형 기본 + 테스트 통과 |
| ⚠️ CONDITIONAL | 핵심 플로우 동작하나 인분 조절 또는 반응형 미흡          |
| ❌ FAIL        | 핵심 플로우(URL→진행→결과) 미동작                        |
