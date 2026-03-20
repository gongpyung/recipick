import { structuredRecipeSchema } from '@/lib/extraction/recipe-schema';
import type {
  RecipeConfidence,
  RecipeIngredient,
  RecipeWarning,
  SourceUsage,
  StructuredRecipe,
} from '@/lib/extraction/types';

interface NormalizeRecipeOptions {
  extractorVersion: string;
  model: string | null;
  usedSources: SourceUsage[];
}

const UNIT_ALIASES = new Map<string, string>([
  ['tbsp', 'tbsp'],
  ['tablespoon', 'tbsp'],
  ['tablespoons', 'tbsp'],
  ['큰술', 'tbsp'],
  ['큰 술', 'tbsp'],
  ['tsp', 'tsp'],
  ['teaspoon', 'tsp'],
  ['teaspoons', 'tsp'],
  ['작은술', 'tsp'],
  ['작은 술', 'tsp'],
  ['cup', 'cup'],
  ['cups', 'cup'],
  ['컵', 'cup'],
  ['g', 'g'],
  ['그램', 'g'],
  ['kg', 'kg'],
  ['킬로그램', 'kg'],
  ['ml', 'ml'],
  ['밀리리터', 'ml'],
  ['l', 'l'],
  ['리터', 'l'],
  ['개', '개'],
  ['줄기', '줄기'],
  ['줌', '줌'],
  ['약간', '약간'],
]);

function normalizeText(value: string | null | undefined) {
  return value?.replace(/\s+/g, ' ').trim() || null;
}

function roundAmount(value: number | null) {
  if (value === null || Number.isNaN(value)) {
    return null;
  }

  return Math.round(value * 100) / 100;
}

function normalizeUnit(unit: string | null) {
  const normalized = normalizeText(unit);
  if (!normalized) {
    return null;
  }

  const key = normalized.toLowerCase();
  return UNIT_ALIASES.get(key) ?? normalized;
}

function dedupeStrings(values: string[]) {
  const seen = new Set<string>();

  return values
    .map((value) => value.replace(/\s+/g, ' ').trim())
    .filter((value) => {
      if (!value || seen.has(value)) {
        return false;
      }

      seen.add(value);
      return true;
    });
}

function normalizeConfidence(confidence: RecipeConfidence | string): RecipeConfidence {
  return confidence === 'high' || confidence === 'low' ? confidence : 'medium';
}

function normalizeIngredients(ingredients: StructuredRecipe['ingredients']) {
  return ingredients.map<RecipeIngredient>((ingredient) => {
    const amount = roundAmount(ingredient.amount);
    const unit = normalizeUnit(ingredient.unit);
    const amountText = normalizeText(ingredient.amountText) ?? (amount !== null ? String(amount) : null);
    const explicitlyNonScalable = unit === '약간' || amount === null;

    return {
      name: normalizeText(ingredient.name) ?? '이름 미상 재료',
      amount,
      amountText,
      unit,
      scalable: explicitlyNonScalable ? false : ingredient.scalable,
      note: normalizeText(ingredient.note),
      confidence: normalizeConfidence(ingredient.confidence),
    };
  });
}

function normalizeSteps(steps: StructuredRecipe['steps']) {
  return steps
    .map((step, index) => ({
      stepNo: index + 1,
      text: normalizeText(step.text) ?? '',
      note: normalizeText(step.note),
      confidence: normalizeConfidence(step.confidence),
    }))
    .filter((step) => step.text.length > 0);
}

function dedupeWarnings(warnings: RecipeWarning[]) {
  const seen = new Set<string>();

  return warnings.filter((warning) => {
    const key = `${warning.code}:${warning.message}`;
    if (seen.has(key)) {
      return false;
    }

    seen.add(key);
    return true;
  });
}

function buildDerivedWarnings(recipe: StructuredRecipe) {
  const warnings: RecipeWarning[] = [];

  if (recipe.baseServings === null) {
    warnings.push({
      code: 'MISSING_BASE_SERVINGS',
      message: '기본 인분 정보가 명확하지 않습니다.',
      severity: 'warning',
    });
  }

  for (const ingredient of recipe.ingredients) {
    if (ingredient.amount === null) {
      warnings.push({
        code: 'MISSING_QUANTITY',
        message: `${ingredient.name}의 수량이 명확하지 않습니다.`,
        severity: 'warning',
      });
    }

    if (ingredient.confidence === 'low') {
      warnings.push({
        code: 'LOW_CONFIDENCE_INGREDIENT',
        message: `${ingredient.name} 재료 정보의 신뢰도가 낮습니다.`,
        severity: 'warning',
      });
    }
  }

  for (const step of recipe.steps) {
    if (step.confidence === 'low') {
      warnings.push({
        code: 'LOW_CONFIDENCE_STEP',
        message: `${step.stepNo}단계 설명의 신뢰도가 낮습니다.`,
        severity: 'warning',
      });
    }
  }

  return warnings;
}

export function normalizeStructuredRecipe(
  recipe: StructuredRecipe,
  options: NormalizeRecipeOptions,
): StructuredRecipe {
  const normalized: StructuredRecipe = {
    title: normalizeText(recipe.title) ?? '이름 없는 레시피',
    source: recipe.source,
    baseServings: roundAmount(recipe.baseServings),
    summary: normalizeText(recipe.summary),
    ingredients: normalizeIngredients(recipe.ingredients),
    steps: normalizeSteps(recipe.steps),
    tips: dedupeStrings(recipe.tips),
    warnings: dedupeWarnings([
      ...recipe.warnings,
      ...buildDerivedWarnings(recipe),
    ]).map((warning) => ({
      code: warning.code,
      message: normalizeText(warning.message) ?? '추가 확인이 필요합니다.',
      severity: warning.severity,
    })),
    confidence: normalizeConfidence(recipe.confidence),
    extractionMeta: {
      usedSources: options.usedSources,
      model: options.model,
      extractorVersion: options.extractorVersion,
    },
  };

  return structuredRecipeSchema.parse(normalized);
}
