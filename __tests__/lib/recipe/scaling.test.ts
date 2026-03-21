import { describe, expect, it } from 'vitest';

import { formatAmount, scaleIngredient } from '@/lib/recipe/scaling';
import type { RecipeIngredient } from '@/lib/extraction/types';

const baseIngredient: RecipeIngredient = {
  name: '간장',
  amount: 2,
  amountText: '2큰술',
  unit: 'tbsp',
  scalable: true,
  note: null,
  confidence: 'high',
};

describe('recipe scaling', () => {
  it('scales a numeric ingredient', () => {
    expect(scaleIngredient(baseIngredient, 4, 2)).toEqual({
      displayAmount: '4',
      displayUnit: 'tbsp',
    });
  });

  it('keeps amount null ingredients unchanged', () => {
    expect(
      scaleIngredient(
        {
          ...baseIngredient,
          amount: null,
          amountText: '적당량',
        },
        4,
        2,
      ),
    ).toEqual({
      displayAmount: '적당량',
      displayUnit: 'tbsp',
    });
  });

  it('keeps non-scalable ingredients unchanged', () => {
    expect(
      scaleIngredient(
        {
          ...baseIngredient,
          scalable: false,
          amountText: '약간',
        },
        4,
        2,
      ),
    ).toEqual({
      displayAmount: '약간',
      displayUnit: 'tbsp',
    });
  });

  it('disables scaling when base servings are missing', () => {
    expect(scaleIngredient(baseIngredient, 4, null)).toEqual({
      displayAmount: '2큰술',
      displayUnit: 'tbsp',
    });
  });

  it('formats decimal results', () => {
    expect(
      scaleIngredient(
        {
          ...baseIngredient,
          amount: 0.5,
          amountText: '0.5컵',
          unit: 'cup',
        },
        4,
        2,
      ),
    ).toEqual({
      displayAmount: '1',
      displayUnit: 'cup',
    });
  });

  it('keeps zero values stable', () => {
    expect(
      scaleIngredient(
        {
          ...baseIngredient,
          amount: 0,
          amountText: '0',
        },
        4,
        2,
      ),
    ).toEqual({
      displayAmount: '0',
      displayUnit: 'tbsp',
    });
  });

  it('formats amounts consistently', () => {
    expect(formatAmount(3)).toBe('3');
    expect(formatAmount(1.25)).toBe('1.3');
  });
});
