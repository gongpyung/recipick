export const MOCK_RECIPE = {
  id: 'test-recipe-001',
  title: '백종원 김치찌개',
  summary: '백종원 셰프의 간단 김치찌개 레시피',
  baseServings: 2,
  ingredients: [
    {
      name: '김치',
      amount: 300,
      amountText: '300',
      unit: 'g',
      scalable: true,
      note: '잘 익은 것',
      confidence: 'high' as const,
    },
    {
      name: '돼지고기',
      amount: 200,
      amountText: '200',
      unit: 'g',
      scalable: true,
      note: null,
      confidence: 'high' as const,
    },
    {
      name: '두부',
      amount: 1,
      amountText: '1',
      unit: '모',
      scalable: true,
      note: null,
      confidence: 'medium' as const,
    },
    {
      name: '대파',
      amount: 1,
      amountText: '1',
      unit: '대',
      scalable: true,
      note: null,
      confidence: 'high' as const,
    },
    {
      name: '참기름',
      amount: null,
      amountText: null,
      unit: null,
      scalable: false,
      note: '적당량',
      confidence: 'low' as const,
    },
  ],
  steps: [
    {
      stepNo: 1,
      text: '김치를 적당한 크기로 썬다',
      note: null,
      confidence: 'high' as const,
    },
    {
      stepNo: 2,
      text: '돼지고기를 볶는다',
      note: '중불에서',
      confidence: 'high' as const,
    },
    {
      stepNo: 3,
      text: '물을 넣고 끓인다',
      note: null,
      confidence: 'medium' as const,
    },
  ],
  tips: ['김치는 잘 익은 것을 사용하세요', '두부는 마지막에 넣으세요'],
  warnings: [
    {
      code: 'MISSING_BASE_SERVINGS',
      message: '기본 인분이 추정값입니다',
      severity: 'info' as const,
    },
  ],
  confidence: 'high' as const,
  youtubeUrl: 'https://www.youtube.com/watch?v=abc123',
  thumbnailUrl: null,
  updatedAt: '2026-03-20T10:00:00Z',
};

export const MOCK_RECIPE_NO_SERVINGS = {
  ...MOCK_RECIPE,
  id: 'test-recipe-002',
  baseServings: null,
};

export const MOCK_RECENT_RECIPES = {
  items: [
    {
      id: 'test-recipe-001',
      title: '백종원 김치찌개',
      thumbnailUrl: null,
      updatedAt: '2026-03-20T10:00:00Z',
    },
    {
      id: 'test-recipe-003',
      title: '봄동비빔밥',
      thumbnailUrl: null,
      updatedAt: '2026-03-19T09:00:00Z',
    },
  ],
};

export const MOCK_RECENT_EMPTY = { items: [] };
