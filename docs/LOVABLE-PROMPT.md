# Lovable UI 개발 프롬프트

아래 프롬프트를 Lovable에 입력하세요. 첨부 이미지(참고 UI 스크린샷)도 함께 첨부하면 더 좋습니다.

---

## 프롬프트

유튜브 요리 영상 URL을 입력하면 AI가 레시피를 추출해주는 한국어 웹앱의 프론트엔드를 만들어 주세요.

### 디자인 방향

- **귀여운 한국 앱 스타일** — 첨부한 이미지의 느낌으로 디자인해 주세요
- 부드러운 파스텔 핑크/베이지/크림 색상 팔레트
- 둥근 카드, 둥근 버튼, 부드러운 그림자
- 친근하고 따뜻한 느낌의 UI
- 아이콘은 귀엽고 부드러운 스타일 (lucide-react 사용)
- 모바일 퍼스트 반응형 디자인
- 모든 텍스트는 한국어

### 색상 팔레트

- 배경: 부드러운 핑크 (#FFF0F3) 또는 크림 (#FFF8F0)
- 메인 카드: 흰색 (#FFFFFF)
- 주요 액센트: 부드러운 코랄 핑크 (#FF8FA3) 또는 살몬 (#FFA07A)
- 보조 색상: 연한 베이지 (#FDE8D8), 연한 라벤더 (#E8DEF8)
- 텍스트: 진한 갈색 (#3D2C2C)
- 서브 텍스트: 부드러운 회갈색 (#8B7D7B)

### 필요한 화면 5개

#### 1. 홈 화면

- 상단에 귀여운 요리 아이콘 + "레시피 AI" 타이틀
- 큰 입력창: "YouTube 링크를 붙여넣으세요" placeholder
- "레시피 추출하기" 버튼 (코랄 핑크, 둥근 모서리)
- 하단에 "최근 추출한 레시피" 섹션 — 카드 리스트 (썸네일 + 제목 + 날짜)
- 레시피가 없을 때 빈 상태: 귀여운 일러스트 + "아직 추출한 레시피가 없어요"

#### 2. 추출 진행 화면

- 중앙에 귀여운 요리사 아이콘 (또는 냄비 아이콘)
- "레시피를 만들고 있어요" 타이틀
- 단계별 진행 표시 (6단계):
  - URL 확인 → 영상 정보 수집 → 자막 수집 → 레시피 구조화 → 결과 검증 → 저장
  - 완료된 단계: 체크 아이콘 + 핑크색
  - 현재 단계: 로딩 애니메이션
  - 대기 단계: 회색
- 실패 시: 에러 메시지 + "다시 시도" 버튼

#### 3. 레시피 결과 화면 (가장 중요!)

- 상단: 레시피 제목 (큰 글씨)
- 인분 조절: 귀여운 - / + 버튼으로 1~8인분 조절
  - 인분 변경 시 재료 수량이 실시간 변경
  - 인분 정보 없으면 "인분 정보가 없어요" 안내
- 재료 섹션:
  - 카드 안에 재료 리스트
  - 각 재료: 이름 (왼쪽) + 수량+단위 (오른쪽)
  - 교대 배경색으로 가독성 향상
- 조리 단계 섹션:
  - 번호가 매겨진 단계 (둥근 원 안에 숫자)
  - 각 단계 텍스트
- 팁 섹션: 연한 초록 배경의 카드
- 경고/주의사항: 연한 노란 배경의 카드
- "수정하기" 버튼, "링크 복사" 버튼, "원본 영상" 링크

#### 4. 편집 모드

- 레시피 결과 화면에서 "수정하기" 누르면 전환
- 제목, 인분 수, 재료(이름/수량/단위), 조리 단계, 팁 수정 가능
- 재료/단계/팁 추가/삭제 버튼
- "저장하기" + "취소" 버튼
- 취소 시 변경사항 있으면 확인 다이얼로그

#### 5. 히스토리 (최근 레시피) 페이지

- 카드 그리드: 썸네일 + 제목 + 날짜
- 카드 hover 시 살짝 올라가는 애니메이션
- 빈 상태: "아직 추출한 레시피가 없어요" + 홈으로 가기 버튼

### 기술 요구사항

- React + TypeScript + Tailwind CSS
- 라우팅: `/` (홈), `/extractions/:id` (진행), `/recipes/:id` (결과+편집), `/history` (히스토리)
- 컴포넌트는 props로 데이터를 받는 구조 (API 호출 로직은 나중에 연결)
- 모든 데이터는 props/mock 데이터로 먼저 구현
- 모바일 (375px) ~ 데스크톱 (1440px) 반응형

### 참고할 디자인

- 첨부한 스크린샷의 디자인 톤앤매너 참고 (귀여운 한국 앱 스타일)
- BBC Good Food (bbcgoodfood.com) — 레시피 결과 화면의 구조/레이아웃 참고
- Samsung Food (samsungfood.com) — 레시피 카드 디자인 참고

### 핵심 타입 (참고용)

```typescript
interface RecipeDetail {
  id: string;
  title: string;
  baseServings: number | null;
  ingredients: {
    name: string;
    amount: number | null;
    amountText: string | null;
    unit: string | null;
    scalable: boolean;
    note: string | null;
    confidence: 'high' | 'medium' | 'low';
  }[];
  steps: {
    stepNo: number;
    text: string;
    note: string | null;
    confidence: 'high' | 'medium' | 'low';
  }[];
  tips: string[];
  warnings: {
    code: string;
    message: string;
    severity: 'info' | 'warning' | 'error';
  }[];
  confidence: 'high' | 'medium' | 'low';
}

interface ExtractionStatus {
  extractionId: string;
  status: 'queued' | 'processing' | 'completed' | 'failed';
  stage?: string;
  recipeId?: string;
  errorCode?: string;
  message?: string;
}

interface RecentRecipeItem {
  id: string;
  title: string;
  thumbnailUrl: string | null;
  updatedAt: string;
}
```

### 인분 조절 로직 (클라이언트 계산)

```
인분 조절 공식: scaledAmount = originalAmount × (targetServings / baseServings)

예외:
- amount가 null → 수량 변경 안 함
- scalable이 false → 수량 변경 안 함
- baseServings가 null → 인분 조절 비활성화
```
