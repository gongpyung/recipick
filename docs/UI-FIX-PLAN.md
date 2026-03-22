# UI Fix Plan — Playwright 테스트 이슈 수정

## 개요

Playwright로 데스크톱(1440px) + 모바일(375px) UI 테스트에서 발견된 레이아웃 이슈 5건 수정.
모든 수정은 Tailwind 클래스 변경만이며 기능 로직 변경 없음.

## 수정 규칙

- 기능 로직 변경하지 않음
- Tailwind CSS 클래스만 수정
- 수정 후 통과: `npm run type-check && npm run lint && npm run build`

---

## Fix 1: 재료명 한 글자씩 줄바꿈 [HIGH]

**파일:** `src/components/recipe-view.tsx`
**문제:** 재료명("통마늘", "청양고추" 등)이 한 글자씩 줄바꿈됨. flex 레이아웃에서 오른쪽 수량 뱃지가 `shrink-0`으로 고정되어 재료명 영역이 너무 좁아짐.

**수정:**

1. 재료 행의 왼쪽 div(이름 영역)에 `flex-1` 추가하여 가용 공간 확보
2. 재료명 `<span>`에 `break-keep` 추가하여 한글 단어 단위 줄바꿈 보장

재료 리스트 내부에서 이름을 감싸는 div를 찾아서:

```
변경 전: <div className="flex items-center gap-3 min-w-0">
변경 후: <div className="flex items-center gap-3 min-w-0 flex-1">
```

재료명 span:

```
변경 전: <span className="font-body text-sm text-[#4a4a4a]">{ingredient.name}</span>
변경 후: <span className="font-body text-sm text-[#4a4a4a] break-keep">{ingredient.name}</span>
```

**참고:** `break-keep`은 Tailwind의 `word-break: keep-all` 유틸리티. 한글 단어 단위 줄바꿈 보장. Chrome 119+, Safari 17+, Firefox 121+ 지원.

---

## Fix 2: 데스크톱에서 하단 네비 숨기기 [HIGH]

**파일 4개:**

- `src/components/bottom-nav.tsx`
- `src/app/page.tsx`
- `src/app/recipes/[id]/page.tsx`
- `src/app/history/page.tsx`

**문제:** 모바일 전용 하단 네비게이션이 데스크톱에서도 표시되어 콘텐츠 위에 겹침. 데스크톱에는 이미 헤더에 네비게이션("최근 레시피" 링크)이 있음.

**수정:**

### bottom-nav.tsx

최외곽 div에 `md:hidden` 추가:

```
변경 전: <div className="no-print fixed bottom-0 left-0 right-0 z-50">
변경 후: <div className="no-print fixed bottom-0 left-0 right-0 z-50 md:hidden">
```

### 각 페이지의 하단 패딩 조건부 적용

하단 네비가 데스크톱에서 사라지므로 `pb-24`도 데스크톱에서 불필요:

**page.tsx** — `<main>` 태그:

```
변경 전: pb-24
변경 후: pb-24 md:pb-0
```

**recipes/[id]/page.tsx** — `<main>` 태그:

```
변경 전: pb-24 또는 pb-28
변경 후: pb-24 md:pb-8 (또는 pb-28 md:pb-8)
```

**history/page.tsx** — `<main>` 태그:

```
변경 전: pb-24
변경 후: pb-24 md:pb-8
```

---

## Fix 3: 레시피 페이지 데스크톱 너비 확장 [MEDIUM]

**파일:** `src/app/recipes/[id]/page.tsx`
**문제:** `max-w-2xl`(672px)이 1440px 데스크톱에서 너무 좁음. 내부에 이미 `lg:grid-cols-[1fr_1.3fr]` 2컬럼 그리드가 있지만 컨테이너가 좁아서 활용 안 됨.

**수정:**

```
변경 전: max-w-2xl
변경 후: max-w-2xl lg:max-w-4xl
```

---

## Fix 4: 히스토리 페이지 데스크톱 너비 확장 [MEDIUM]

**파일:** `src/app/history/page.tsx`
**문제:** `max-w-lg`(512px)로 데스크톱에서 카드 2개만 표시. `history-list.tsx`에 이미 `lg:grid-cols-3`가 있지만 부모가 좁아서 작동 안 함.

**수정:**

```
변경 전: max-w-lg
변경 후: max-w-lg lg:max-w-4xl
```

---

## Fix 5: 모바일 hero 섹션 하단 패딩 [LOW]

**파일:** `src/app/page.tsx`
**문제:** hero 섹션 하단 패딩(`pb-16`)이 모바일에서 부족하여 피처 카드가 하단 네비에 가려질 수 있음.

**수정:**
hero `<section>` 태그에서:

```
변경 전: pb-16 pt-14 md:pb-24
변경 후: pb-24 pt-14 md:pb-24
```

---

## 검증

수정 완료 후:

```bash
npm run type-check
npm run lint
npm run build
```

모두 통과해야 함.

**Playwright 재검증 권장:**

- 데스크톱(1440px): 레시피 결과 화면 재료 리스트, 하단 네비 미표시 확인
- 모바일(375px): 레시피 결과 화면 재료 줄바꿈, 하단 네비 정상 표시 확인
- 히스토리(1440px): 3컬럼 그리드 표시 확인
