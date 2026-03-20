import type { PostgrestError } from '@supabase/supabase-js';

import type {
  RecipeConfidence,
  RecipeIngredient,
  RecipeStep,
  RecipeWarning,
} from '@/lib/extraction/types';
import { getSupabaseServerClient } from '@/lib/supabase/client';
import type {
  IngredientRow,
  RecipeRow,
  StepRow,
  WarningRow,
} from '@/lib/supabase/types';

export interface RecipeDetails {
  id: string;
  title: string;
  baseServings: number | null;
  ingredients: RecipeIngredient[];
  steps: RecipeStep[];
  tips: string[];
  warnings: RecipeWarning[];
  confidence: RecipeConfidence;
}

interface RecipeIdQueryBuilder {
  eq(column: 'extraction_id', value: string): {
    maybeSingle(): Promise<{
      data: { id: string } | null;
      error: PostgrestError | null;
    }>;
  };
}

interface RecipeRowQueryBuilder {
  eq(column: 'id', value: string): {
    maybeSingle(): Promise<{
      data: RecipeRow | null;
      error: PostgrestError | null;
    }>;
  };
}

interface RecipesTableClient {
  select(columns: 'id'): RecipeIdQueryBuilder;
  select(columns: string): RecipeRowQueryBuilder;
}

interface RelatedRowsQueryBuilder<Row> {
  eq(column: 'recipe_id', value: string): {
    order(
      column: string,
      options: { ascending: boolean },
    ): Promise<{
      data: Row[] | null;
      error: PostgrestError | null;
    }>;
  };
}

interface RelatedTableClient<Row> {
  select(columns: string): RelatedRowsQueryBuilder<Row>;
}

interface SupabaseSubset {
  from(table: 'recipes'): RecipesTableClient;
  from(table: 'ingredients'): RelatedTableClient<IngredientRow>;
  from(table: 'steps'): RelatedTableClient<StepRow>;
  from(table: 'warnings'): RelatedTableClient<WarningRow>;
}

function getSupabase() {
  return getSupabaseServerClient() as unknown as SupabaseSubset;
}

function assertNoSupabaseError(error: PostgrestError | null) {
  if (error) {
    throw new Error(error.message);
  }
}

export async function getRecipeIdByExtractionId(extractionId: string) {
  const supabase = getSupabaseServerClient();
  const result = await supabase
    .from('recipes')
    .select('id')
    .eq('extraction_id', extractionId)
    .maybeSingle();
  const data = result.data as Pick<RecipeRow, 'id'> | null;
  const error = result.error;

  assertNoSupabaseError(error);
  return data?.id ?? null;
}

export async function getRecipe(recipeId: string): Promise<RecipeDetails | null> {
  const supabase = getSupabaseServerClient();
  const recipeResult = await supabase
    .from('recipes')
    .select('*')
    .eq('id', recipeId)
    .maybeSingle();
  const recipe = recipeResult.data as RecipeRow | null;
  const recipeError = recipeResult.error;

  assertNoSupabaseError(recipeError);

  if (!recipe) {
    return null;
  }

  const [ingredientsResult, stepsResult, warningsResult] = await Promise.all([
    supabase
      .from('ingredients')
      .select('*')
      .eq('recipe_id', recipeId)
      .order('sort_order', { ascending: true }),
    supabase
      .from('steps')
      .select('*')
      .eq('recipe_id', recipeId)
      .order('step_no', { ascending: true }),
    supabase
      .from('warnings')
      .select('*')
      .eq('recipe_id', recipeId)
      .order('code', { ascending: true }),
  ]);

  assertNoSupabaseError(ingredientsResult.error);
  assertNoSupabaseError(stepsResult.error);
  assertNoSupabaseError(warningsResult.error);

  const ingredients = (ingredientsResult.data ?? []) as IngredientRow[];
  const steps = (stepsResult.data ?? []) as StepRow[];
  const warnings = (warningsResult.data ?? []) as WarningRow[];

  return {
    id: recipe.id,
    title: recipe.title,
    baseServings: recipe.base_servings,
    ingredients: ingredients.map((ingredient) => ({
      name: ingredient.name,
      amount: ingredient.amount_value,
      amountText: ingredient.amount_text,
      unit: ingredient.unit,
      scalable: ingredient.scalable,
      note: ingredient.note,
      confidence: ingredient.confidence,
    })),
    steps: steps.map((step) => ({
      stepNo: step.step_no,
      text: step.text,
      note: step.note,
      confidence: step.confidence,
    })),
    tips: recipe.tips_json,
    warnings: warnings.map((warning) => ({
      code: warning.code,
      message: warning.message,
      severity: warning.severity,
    })),
    confidence: recipe.confidence,
  };
}
