import { describe, expect, it } from 'vitest';

import { normalizeStructuredRecipe } from '@/lib/extraction/normalizer';

describe('normalizeStructuredRecipe', () => {
  it('normalizes units, reorders steps, and adds missing servings warning', () => {
    const result = normalizeStructuredRecipe({
      title: '  파스타  ',
      source: {
        youtubeUrl: 'https://www.youtube.com/watch?v=abc123',
        videoId: 'abc123',
        sourceType: 'video',
        language: 'ko',
      },
      baseServings: null,
      summary: '  간단한 파스타  ',
      ingredients: [
        {
          name: ' 올리브유 ',
          amount: 1,
          amountText: '1 큰술',
          unit: '큰술',
          scalable: true,
          note: null,
          confidence: 'medium',
        },
      ],
      steps: [
        {
          stepNo: 2,
          text: ' 면을 삶는다. ',
          note: null,
          confidence: 'medium',
        },
        {
          stepNo: 1,
          text: ' 물을 끓인다. ',
          note: null,
          confidence: 'medium',
        },
      ],
      tips: ['  뜨겁게 먹는다.  '],
      warnings: [],
      confidence: 'medium',
    });

    expect(result.title).toBe('파스타');
    expect(result.summary).toBe('간단한 파스타');
    expect(result.ingredients[0].unit).toBe('tbsp');
    expect(result.steps.map((step) => step.stepNo)).toEqual([1, 2]);
    expect(
      result.warnings.some(
        (warning) => warning.code === 'MISSING_BASE_SERVINGS',
      ),
    ).toBe(true);
  });
});
