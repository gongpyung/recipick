import type { PostgrestError } from '@supabase/supabase-js';

import type {
  PersistedRecipe,
  RecipeConfidence,
  RecipeIngredient,
  RecipeStep,
  RecipeWarning,
  StructuredRecipe,
} from '@/lib/extraction/types';
import { getSupabaseServerClient } from '@/lib/supabase/client';
import type {
  IngredientInsert,
  IngredientRow,
  RecipeInsert,
  RecipeRow,
  StepInsert,
  StepRow,
  WarningInsert,
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

interface RecipesTableClient {
  select(columns: string): {
    eq(column: 'extraction_id' | 'id', value: string): {
      maybeSingle(): Promise<{
        data: RecipeRow | Pick<RecipeRow, 'id'> | null;
        error: PostgrestError | null;
      }>;
    };
  };
  insert(values: RecipeInsert): {
    select(columns: string): {
      single(): Promise<{
        data: RecipeRow;
        error: PostgrestError | null;
      }>;
    };
  };
}

interface ChildTableClient<Row, Insert> {
  select(columns: string): {
    eq(column: 'recipe_id', value: string): {
      order(
        column: string,
        options: { ascending: boolean },
      ): Promise<{
        data: Row[] | null;
        error: PostgrestError | null;
      }>;
    };
  };
  insert(values: Insert[]): Promise<{
    error: PostgrestError | null;
  }>;
}

interface RecipeSupabaseSubset {
  from(table: 'recipes'): RecipesTableClient;
  from(table: 'ingredients'): ChildTableClient<IngredientRow, IngredientInsert>;
  from(table: 'steps'): ChildTableClient<StepRow, StepInsert>;
  from(table: 'warnings'): ChildTableClient<WarningRow, WarningInsert>;
}

function getRecipeSupabase() {
  return getSupabaseServerClient() as unknown as RecipeSupabaseSubset;
}

function assertNoSupabaseError(error: PostgrestError | null, message?: string) {
  if (error) {
    throw new Error(message ?? error.message);
  }
}

function mapIngredientInsert(
  recipeId: string,
  ingredients: StructuredRecipe['ingredients'],
): IngredientInsert[] {
  return ingredients.map((ingredient, index) => ({
    recipe_id: recipeId,
    sort_order: index + 1,
    name: ingredient.name,
    amount_value: ingredient.amount,
    amount_text: ingredient.amountText,
    unit: ingredient.unit,
    scalable: ingredient.scalable,
    note: ingredient.note,
    confidence: ingredient.confidence,
  }));
}

function mapStepInsert(
  recipeId: string,
  steps: StructuredRecipe['steps'],
): StepInsert[] {
  return steps.map((step, index) => ({
    recipe_id: recipeId,
    step_no: index + 1,
    text: step.text,
    note: step.note,
    confidence: step.confidence,
  }));
}

function mapWarningInsert(
  recipeId: string,
  warnings: StructuredRecipe['warnings'],
): WarningInsert[] {
  return warnings.map((warning) => ({
    recipe_id: recipeId,
    code: warning.code,
    message: warning.message,
    severity: warning.severity,
  }));
}

export async function getRecipeIdByExtractionId(extractionId: string) {
  const supabase = getRecipeSupabase();
  const { data, error } = await supabase
    .from('recipes')
    .select('id')
    .eq('extraction_id', extractionId)
    .maybeSingle();

  assertNoSupabaseError(error);
  return data?.id ?? null;
}

export async function saveRecipeAggregate(input: {
  videoId: string;
  extractionId: string;
  recipe: StructuredRecipe;
}): Promise<PersistedRecipe> {
  const supabase = getRecipeSupabase();
  const now = new Date().toISOString();

  const recipeInsert: RecipeInsert = {
    video_id: input.videoId,
    extraction_id: input.extractionId,
    title: input.recipe.title,
    summary: input.recipe.summary,
    base_servings: input.recipe.baseServings,
    confidence: input.recipe.confidence,
    tips_json: input.recipe.tips,
    is_user_edited: false,
    created_at: now,
    updated_at: now,
  };

  const recipeResult = await supabase
    .from('recipes')
    .insert(recipeInsert)
    .select('*')
    .single();

  assertNoSupabaseError(recipeResult.error, 'Failed to persist recipe.');

  const recipeRow = recipeResult.data;
  const ingredients = mapIngredientInsert(recipeRow.id, input.recipe.ingredients);
  const steps = mapStepInsert(recipeRow.id, input.recipe.steps);
  const warnings = mapWarningInsert(recipeRow.id, input.recipe.warnings);

  if (ingredients.length > 0) {
    const ingredientsResult = await supabase.from('ingredients').insert(ingredients);
    assertNoSupabaseError(ingredientsResult.error, 'Failed to persist ingredients.');
  }

  if (steps.length > 0) {
    const stepsResult = await supabase.from('steps').insert(steps);
    assertNoSupabaseError(stepsResult.error, 'Failed to persist steps.');
  }

  if (warnings.length > 0) {
    const warningsResult = await supabase.from('warnings').insert(warnings);
    assertNoSupabaseError(warningsResult.error, 'Failed to persist warnings.');
  }

  return {
    ...input.recipe,
    id: recipeRow.id,
    videoId: input.videoId,
    extractionId: input.extractionId,
    isUserEdited: recipeRow.is_user_edited,
    updatedAt: recipeRow.updated_at,
  };
}

export async function getRecipe(recipeId: string): Promise<RecipeDetails | null> {
  const supabase = getRecipeSupabase();
  const recipeResult = await supabase
    .from('recipes')
    .select('*')
    .eq('id', recipeId)
    .maybeSingle();

  assertNoSupabaseError(recipeResult.error);

  const recipe = recipeResult.data as RecipeRow | null;

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

  const ingredients = ingredientsResult.data ?? [];
  const steps = stepsResult.data ?? [];
  const warnings = warningsResult.data ?? [];

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
