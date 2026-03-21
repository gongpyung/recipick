import { describe, expect, it } from 'vitest'

import { parseStructuredRecipe } from '@/lib/extraction/recipe-schema'

describe('parseStructuredRecipe', () => {
  const validPayload = {
    title: '대파제육볶음',
    source: {
      youtubeUrl: 'https://www.youtube.com/watch?v=abc123',
      videoId: 'abc123',
      sourceType: 'video',
      language: 'ko',
    },
    baseServings: 2,
    summary: null,
    ingredients: [
      {
        name: '돼지고기',
        amount: 300,
        amountText: '300g',
        unit: 'g',
        scalable: true,
        note: null,
        confidence: 'high',
      },
    ],
    steps: [
      {
        stepNo: 1,
        text: '돼지고기를 볶는다.',
        note: null,
        confidence: 'high',
      },
    ],
    tips: [],
    warnings: [],
    confidence: 'high',
  } as const

  it('accepts a valid structured recipe payload', () => {
    expect(parseStructuredRecipe(validPayload)).toMatchObject({
      title: '대파제육볶음',
      baseServings: 2,
    })
  })

  it('rejects unexpected fields', () => {
    expect(() =>
      parseStructuredRecipe({
        ...validPayload,
        extra: true,
      }),
    ).toThrow()
  })
})
