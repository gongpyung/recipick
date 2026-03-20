import { errorResponse, successResponse } from '@/lib/api/response';
import { recipePatchSchema } from '@/lib/extraction/recipe-schema';
import {
  ExtractionErrorCode,
  getExtractionErrorMessage,
  getExtractionErrorStatus,
} from '@/lib/extraction/errors';
import { getRecipe, updateRecipe } from '@/lib/recipe/service';

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  const recipe = await getRecipe(id);

  if (!recipe) {
    return errorResponse(
      ExtractionErrorCode.RECIPE_NOT_FOUND,
      getExtractionErrorMessage(ExtractionErrorCode.RECIPE_NOT_FOUND),
      getExtractionErrorStatus(ExtractionErrorCode.RECIPE_NOT_FOUND),
    );
  }

  return successResponse({
    id: recipe.id,
    title: recipe.title,
    baseServings: recipe.baseServings,
    ingredients: recipe.ingredients,
    steps: recipe.steps,
    tips: recipe.tips,
    warnings: recipe.warnings,
    confidence: recipe.confidence,
  });
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  const body = recipePatchSchema.safeParse(await request.json());

  if (!body.success) {
    return errorResponse(
      ExtractionErrorCode.INTERNAL_ERROR,
      body.error.issues.map((issue) => issue.message).join(', '),
      400,
    );
  }

  const updatedRecipe = await updateRecipe(id, body.data);

  if (!updatedRecipe) {
    return errorResponse(
      ExtractionErrorCode.RECIPE_NOT_FOUND,
      getExtractionErrorMessage(ExtractionErrorCode.RECIPE_NOT_FOUND),
      getExtractionErrorStatus(ExtractionErrorCode.RECIPE_NOT_FOUND),
    );
  }

  return successResponse({
    id: updatedRecipe.id,
    updated: true,
    updatedAt: updatedRecipe.updated_at,
  });
}
