import type { RecipeIngredient } from '@/lib/extraction/types';

export interface ScaledIngredientDisplay {
  displayAmount: string | null;
  displayUnit: string | null;
}

export function formatAmount(amount: number) {
  if (Number.isInteger(amount)) {
    return String(amount);
  }

  return amount.toFixed(1).replace(/\.0$/, '');
}

export function scaleIngredient(
  ingredient: RecipeIngredient,
  targetServings: number,
  baseServings: number | null,
): ScaledIngredientDisplay {
  if (
    baseServings === null ||
    ingredient.amount === null ||
    ingredient.scalable === false
  ) {
    return {
      displayAmount: ingredient.amountText ?? null,
      displayUnit: ingredient.unit,
    };
  }

  if (baseServings === 0) {
    return {
      displayAmount: ingredient.amountText ?? null,
      displayUnit: ingredient.unit,
    };
  }

  const scaledAmount = ingredient.amount * (targetServings / baseServings);

  return {
    displayAmount: formatAmount(scaledAmount),
    displayUnit: ingredient.unit,
  };
}
