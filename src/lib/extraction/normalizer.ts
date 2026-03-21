import type {
  RecipeConfidence,
  RecipeIngredient,
  RecipeStep,
  RecipeWarning,
  StructuredRecipe,
} from '@/lib/extraction/types';
import { normalizeUnit } from '@/lib/extraction/unit-map';

function normalizeConfidence(value: RecipeConfidence | undefined) {
  return value ?? 'medium';
}

function normalizeIngredient(ingredient: RecipeIngredient): RecipeIngredient {
  return {
    name: ingredient.name.trim(),
    amount: ingredient.amount ?? null,
    amountText: ingredient.amountText ?? null,
    unit: normalizeUnit(ingredient.unit),
    scalable: ingredient.scalable,
    note: ingredient.note ?? null,
    confidence: normalizeConfidence(ingredient.confidence),
  };
}

function normalizeStep(step: RecipeStep, index: number): RecipeStep {
  return {
    stepNo: index + 1,
    text: step.text.trim(),
    note: step.note ?? null,
    confidence: normalizeConfidence(step.confidence),
  };
}

function dedupeWarnings(warnings: RecipeWarning[]) {
  const seen = new Set<string>();

  return warnings.filter((warning) => {
    const key = `${warning.code}:${warning.message}:${warning.severity}`;

    if (seen.has(key)) {
      return false;
    }

    seen.add(key);
    return true;
  });
}

export function normalizeStructuredRecipe(
  recipe: StructuredRecipe,
): StructuredRecipe {
  const normalizedWarnings = dedupeWarnings(
    recipe.warnings.map((warning) => ({
      code: warning.code,
      message: warning.message.trim(),
      severity: warning.severity,
    })),
  );

  if (
    recipe.baseServings === null &&
    !normalizedWarnings.some((warning) => warning.code === 'MISSING_BASE_SERVINGS')
  ) {
    normalizedWarnings.push({
      code: 'MISSING_BASE_SERVINGS',
      message: '기본 인분 정보를 찾지 못했습니다.',
      severity: 'warning',
    });
  }

  const normalizedIngredients = recipe.ingredients.map(normalizeIngredient);
  const normalizedSteps = [...recipe.steps]
    .sort((left, right) => left.stepNo - right.stepNo)
    .map(normalizeStep);

  return {
    ...recipe,
    title: recipe.title.trim(),
    summary: recipe.summary?.trim() ?? null,
    baseServings: recipe.baseServings ?? null,
    ingredients: normalizedIngredients,
    steps: normalizedSteps,
    tips: recipe.tips.map((tip) => tip.trim()).filter(Boolean),
    warnings: normalizedWarnings,
    confidence: normalizeConfidence(recipe.confidence),
    extractionMeta: recipe.extractionMeta
      ? {
          ...recipe.extractionMeta,
          model: recipe.extractionMeta.model ?? null,
          extractorVersion: recipe.extractionMeta.extractorVersion ?? null,
        }
      : undefined,
  };
}
