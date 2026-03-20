import type { PostgrestError } from '@supabase/supabase-js';

import {
  recipePatchSchema,
  structuredRecipeSchema,
  type RecipePatchInput,
} from '@/lib/extraction/recipe-schema';
import type {
  PersistedRecipe,
  RecipeRecord,
  StructuredRecipe,
} from '@/lib/extraction/types';
import { getSupabaseServerClient } from '@/lib/supabase/client';
import type {
  IngredientRow,
  RecipeInsert,
  RecipeRow,
  RecipeUpdate,
  StepRow,
  WarningRow,
} from '@/lib/supabase/types';

function assertNoSupabaseError(error: PostgrestError | null) {
  if (error) {
    throw new Error(error.message);
  }
}

function mapRecipe(
  recipe: RecipeRow,
  ingredients: IngredientRow[],
  steps: StepRow[],
  warnings: WarningRow[],
): PersistedRecipe {
  return {
    id: recipe.id,
    videoId: recipe.video_id,
    extractionId: recipe.extraction_id,
    title: recipe.title,
    source: {
      youtubeUrl: '',
      videoId: recipe.video_id,
      sourceType: 'video',
      language: null,
    },
    baseServings: recipe.base_servings,
    summary: recipe.summary,
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
    extractionMeta: undefined,
    isUserEdited: recipe.is_user_edited,
    updatedAt: recipe.updated_at,
  };
}

async function replaceRecipeDetails(
  recipeId: string,
  recipe: Pick<StructuredRecipe, 'ingredients' | 'steps' | 'warnings'>,
) {
  const supabase = getSupabaseServerClient();

  for (const table of ['ingredients', 'steps', 'warnings'] as const) {
    const { error } = await supabase.from(table).delete().eq('recipe_id', recipeId);
    assertNoSupabaseError(error);
  }

  if (recipe.ingredients.length > 0) {
    const { error } = await supabase.from('ingredients').insert(
      recipe.ingredients.map((ingredient, index) => ({
        recipe_id: recipeId,
        sort_order: index,
        name: ingredient.name,
        amount_value: ingredient.amount,
        amount_text: ingredient.amountText,
        unit: ingredient.unit,
        scalable: ingredient.scalable,
        note: ingredient.note,
        confidence: ingredient.confidence,
      })),
    );
    assertNoSupabaseError(error);
  }

  if (recipe.steps.length > 0) {
    const { error } = await supabase.from('steps').insert(
      recipe.steps.map((step, index) => ({
        recipe_id: recipeId,
        step_no: index + 1,
        text: step.text,
        note: step.note,
        confidence: step.confidence,
      })),
    );
    assertNoSupabaseError(error);
  }

  if (recipe.warnings.length > 0) {
    const { error } = await supabase.from('warnings').insert(
      recipe.warnings.map((warning) => ({
        recipe_id: recipeId,
        code: warning.code,
        message: warning.message,
        severity: warning.severity,
      })),
    );
    assertNoSupabaseError(error);
  }
}

export async function getRecipeIdByExtractionId(extractionId: string) {
  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase
    .from('recipes')
    .select('id')
    .eq('extraction_id', extractionId)
    .maybeSingle();

  assertNoSupabaseError(error);
  return data?.id ?? null;
}

export async function createRecipeFromExtraction(input: {
  videoId: string;
  extractionId: string;
  recipe: StructuredRecipe;
}) {
  const recipe = structuredRecipeSchema.parse(input.recipe);
  const supabase = getSupabaseServerClient();
  const now = new Date().toISOString();
  const recipeInsert: RecipeInsert = {
    video_id: input.videoId,
    extraction_id: input.extractionId,
    title: recipe.title,
    summary: recipe.summary,
    base_servings: recipe.baseServings,
    confidence: recipe.confidence,
    tips_json: recipe.tips,
    is_user_edited: false,
    created_at: now,
    updated_at: now,
  };

  const { data, error } = await supabase
    .from('recipes')
    .insert(recipeInsert)
    .select('*')
    .single();

  assertNoSupabaseError(error);
  await replaceRecipeDetails(data.id, recipe);
  return data;
}

export async function getRecipe(recipeId: string): Promise<PersistedRecipe | null> {
  const supabase = getSupabaseServerClient();
  const { data: recipe, error: recipeError } = await supabase
    .from('recipes')
    .select('*')
    .eq('id', recipeId)
    .maybeSingle();

  assertNoSupabaseError(recipeError);

  if (!recipe) {
    return null;
  }

  const [{ data: ingredients, error: ingredientError }, { data: steps, error: stepError }, { data: warnings, error: warningError }] = await Promise.all([
    supabase.from('ingredients').select('*').eq('recipe_id', recipeId).order('sort_order', { ascending: true }),
    supabase.from('steps').select('*').eq('recipe_id', recipeId).order('step_no', { ascending: true }),
    supabase.from('warnings').select('*').eq('recipe_id', recipeId).order('code', { ascending: true }),
  ]);

  assertNoSupabaseError(ingredientError);
  assertNoSupabaseError(stepError);
  assertNoSupabaseError(warningError);

  return mapRecipe(recipe, ingredients ?? [], steps ?? [], warnings ?? []);
}

export async function updateRecipe(
  recipeId: string,
  patch: RecipePatchInput,
): Promise<RecipeRecord | null> {
  const parsedPatch = recipePatchSchema.parse(patch);
  const supabase = getSupabaseServerClient();
  const updatePayload: RecipeUpdate = {
    title: parsedPatch.title,
    summary: parsedPatch.summary ?? null,
    base_servings: parsedPatch.baseServings,
    confidence: parsedPatch.confidence ?? 'medium',
    tips_json: parsedPatch.tips,
    is_user_edited: true,
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await supabase
    .from('recipes')
    .update(updatePayload)
    .eq('id', recipeId)
    .select('*')
    .maybeSingle();

  assertNoSupabaseError(error);

  if (!data) {
    return null;
  }

  await replaceRecipeDetails(recipeId, {
    ingredients: parsedPatch.ingredients,
    steps: parsedPatch.steps,
    warnings: parsedPatch.warnings,
  });

  return data;
}
