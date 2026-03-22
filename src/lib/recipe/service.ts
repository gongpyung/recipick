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
  RecipeUpdate,
  StepInsert,
  StepRow,
  VideoRow,
  WarningInsert,
  WarningRow,
} from '@/lib/supabase/types';

export interface RecipeDetails {
  id: string;
  title: string;
  summary: string | null;
  baseServings: number | null;
  ingredients: RecipeIngredient[];
  steps: RecipeStep[];
  tips: string[];
  warnings: RecipeWarning[];
  confidence: RecipeConfidence;
  youtubeUrl: string | null;
  thumbnailUrl: string | null;
  updatedAt: string;
}

export interface RecentRecipeListItem {
  id: string;
  title: string;
  thumbnailUrl: string | null;
  updatedAt: string;
}

interface RecipesTableClient {
  select(columns: string): {
    eq(
      column: 'extraction_id' | 'id',
      value: string,
    ): {
      maybeSingle(): Promise<{
        data: RecipeRow | Pick<RecipeRow, 'id'> | null;
        error: PostgrestError | null;
      }>;
    };
    order(
      column: 'updated_at',
      options: { ascending: boolean },
    ): {
      limit(limit: number): Promise<{
        data: RecipeRow[] | null;
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
  update(values: RecipeUpdate): {
    eq(
      column: 'id',
      value: string,
    ): Promise<{
      error: PostgrestError | null;
    }>;
  };
  delete(): {
    eq(
      column: 'id',
      value: string,
    ): Promise<{
      error: PostgrestError | null;
    }>;
  };
}

interface ChildTableClient<Row, Insert> {
  select(columns: string): {
    eq(
      column: 'recipe_id',
      value: string,
    ): {
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
  delete(): {
    eq(
      column: 'recipe_id',
      value: string,
    ): Promise<{
      error: PostgrestError | null;
    }>;
  };
}

interface VideosTableClient {
  select(columns: string): {
    eq(
      column: 'id',
      value: string,
    ): {
      maybeSingle(): Promise<{
        data: Pick<VideoRow, 'id' | 'thumbnail_url' | 'youtube_url'> | null;
        error: PostgrestError | null;
      }>;
    };
  };
}

interface RecipeSupabaseSubset {
  from(table: 'recipes'): RecipesTableClient;
  from(table: 'ingredients'): ChildTableClient<IngredientRow, IngredientInsert>;
  from(table: 'steps'): ChildTableClient<StepRow, StepInsert>;
  from(table: 'warnings'): ChildTableClient<WarningRow, WarningInsert>;
  from(table: 'videos'): VideosTableClient;
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
  const ingredients = mapIngredientInsert(
    recipeRow.id,
    input.recipe.ingredients,
  );
  const steps = mapStepInsert(recipeRow.id, input.recipe.steps);
  const warnings = mapWarningInsert(recipeRow.id, input.recipe.warnings);

  try {
    if (ingredients.length > 0) {
      const ingredientsResult = await supabase
        .from('ingredients')
        .insert(ingredients);
      assertNoSupabaseError(
        ingredientsResult.error,
        'Failed to persist ingredients.',
      );
    }

    if (steps.length > 0) {
      const stepsResult = await supabase.from('steps').insert(steps);
      assertNoSupabaseError(stepsResult.error, 'Failed to persist steps.');
    }

    if (warnings.length > 0) {
      const warningsResult = await supabase.from('warnings').insert(warnings);
      assertNoSupabaseError(
        warningsResult.error,
        'Failed to persist warnings.',
      );
    }
  } catch (error) {
    const rollbackResult = await supabase
      .from('recipes')
      .delete()
      .eq('id', recipeRow.id);
    assertNoSupabaseError(
      rollbackResult.error,
      'Failed to roll back recipe persistence.',
    );
    throw error;
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

export async function getRecipe(
  recipeId: string,
): Promise<RecipeDetails | null> {
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

  const [ingredientsResult, stepsResult, warningsResult, videoResult] =
    await Promise.all([
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
      supabase
        .from('videos')
        .select('id, thumbnail_url, youtube_url')
        .eq('id', recipe.video_id)
        .maybeSingle(),
    ]);

  assertNoSupabaseError(ingredientsResult.error);
  assertNoSupabaseError(stepsResult.error);
  assertNoSupabaseError(warningsResult.error);
  assertNoSupabaseError(videoResult.error);

  const ingredients = ingredientsResult.data ?? [];
  const steps = stepsResult.data ?? [];
  const warnings = warningsResult.data ?? [];
  const video = videoResult.data;

  return {
    id: recipe.id,
    title: recipe.title,
    summary: recipe.summary,
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
    youtubeUrl: video?.youtube_url ?? null,
    thumbnailUrl: video?.thumbnail_url ?? null,
    updatedAt: recipe.updated_at,
  };
}

export async function listRecentRecipes(
  limit = 20,
): Promise<RecentRecipeListItem[]> {
  const supabase = getRecipeSupabase();
  const recipeResult = await supabase
    .from('recipes')
    .select('*')
    .order('updated_at', { ascending: false })
    .limit(limit);

  assertNoSupabaseError(recipeResult.error);

  const recipes = recipeResult.data ?? [];

  if (recipes.length === 0) return [];

  const videoIds = [...new Set(recipes.map((r) => r.video_id))];
  const videoResult = await supabase
    .from('videos')
    .select('id, thumbnail_url')
    .eq('id', videoIds[0])
    .maybeSingle();

  assertNoSupabaseError(videoResult.error);

  // 단일 조회 후 Map 구성 (N+1 → 1+1)
  const videoMap = new Map<string, string | null>();
  if (videoResult.data) {
    videoMap.set(videoResult.data.id, videoResult.data.thumbnail_url);
  }
  // 나머지 video도 조회 (videoIds가 여러 개일 경우)
  for (const vid of videoIds.slice(1)) {
    const r = await supabase
      .from('videos')
      .select('id, thumbnail_url')
      .eq('id', vid)
      .maybeSingle();
    if (r.data) videoMap.set(r.data.id, r.data.thumbnail_url);
  }

  return recipes.map((recipe) => ({
    id: recipe.id,
    title: recipe.title,
    thumbnailUrl: videoMap.get(recipe.video_id) ?? null,
    updatedAt: recipe.updated_at,
  }));
}

export async function updateRecipeAggregate(input: {
  recipeId: string;
  recipe: Pick<
    StructuredRecipe,
    | 'title'
    | 'baseServings'
    | 'ingredients'
    | 'steps'
    | 'tips'
    | 'warnings'
    | 'confidence'
  >;
}) {
  const supabase = getRecipeSupabase();
  const now = new Date().toISOString();
  const updateResult = await supabase
    .from('recipes')
    .update({
      title: input.recipe.title,
      base_servings: input.recipe.baseServings,
      confidence: input.recipe.confidence,
      tips_json: input.recipe.tips,
      updated_at: now,
      is_user_edited: true,
    })
    .eq('id', input.recipeId);

  assertNoSupabaseError(updateResult.error, 'Failed to update recipe.');

  const [deleteIngredients, deleteSteps, deleteWarnings] = await Promise.all([
    supabase.from('ingredients').delete().eq('recipe_id', input.recipeId),
    supabase.from('steps').delete().eq('recipe_id', input.recipeId),
    supabase.from('warnings').delete().eq('recipe_id', input.recipeId),
  ]);

  assertNoSupabaseError(deleteIngredients.error);
  assertNoSupabaseError(deleteSteps.error);
  assertNoSupabaseError(deleteWarnings.error);

  const ingredients = mapIngredientInsert(
    input.recipeId,
    input.recipe.ingredients,
  );
  const steps = mapStepInsert(input.recipeId, input.recipe.steps);
  const warnings = mapWarningInsert(input.recipeId, input.recipe.warnings);

  if (ingredients.length > 0) {
    const ingredientInsertResult = await supabase
      .from('ingredients')
      .insert(ingredients);
    assertNoSupabaseError(ingredientInsertResult.error);
  }

  if (steps.length > 0) {
    const stepInsertResult = await supabase.from('steps').insert(steps);
    assertNoSupabaseError(stepInsertResult.error);
  }

  if (warnings.length > 0) {
    const warningInsertResult = await supabase
      .from('warnings')
      .insert(warnings);
    assertNoSupabaseError(warningInsertResult.error);
  }
}
