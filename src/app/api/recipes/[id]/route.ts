import { errorResponse, successResponse } from '@/lib/api/response';
import {
  ExtractionErrorCode,
  getExtractionErrorMessage,
  getExtractionErrorStatus,
} from '@/lib/extraction/errors';
import { getRecipe, updateRecipeAggregate } from '@/lib/recipe/service';

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

  return successResponse(recipe);
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  const body = (await request.json()) as {
    title: string;
    baseServings: number | null;
    ingredients: Array<{
      name: string;
      amount: number | null;
      amountText: string | null;
      unit: string | null;
      scalable: boolean;
      note: string | null;
      confidence: 'high' | 'medium' | 'low';
    }>;
    steps: Array<{
      stepNo: number;
      text: string;
      note: string | null;
      confidence: 'high' | 'medium' | 'low';
    }>;
    tips: string[];
    warnings: Array<{
      code:
        | 'MISSING_QUANTITY'
        | 'MISSING_BASE_SERVINGS'
        | 'LOW_CONFIDENCE_INGREDIENT'
        | 'LOW_CONFIDENCE_STEP'
        | 'MULTIPLE_DISHES_DETECTED'
        | 'NON_RECIPE_VIDEO'
        | 'INSUFFICIENT_SOURCE_TEXT'
        | 'OCR_REQUIRED_BUT_DISABLED';
      message: string;
      severity: 'info' | 'warning' | 'error';
    }>;
    confidence: 'high' | 'medium' | 'low';
  };

  const existingRecipe = await getRecipe(id);

  if (!existingRecipe) {
    return errorResponse(
      ExtractionErrorCode.RECIPE_NOT_FOUND,
      getExtractionErrorMessage(ExtractionErrorCode.RECIPE_NOT_FOUND),
      getExtractionErrorStatus(ExtractionErrorCode.RECIPE_NOT_FOUND),
    );
  }

  await updateRecipeAggregate({
    recipeId: id,
    recipe: {
      title: body.title,
      baseServings: body.baseServings,
      ingredients: body.ingredients,
      steps: body.steps,
      tips: body.tips,
      warnings: body.warnings,
      confidence: body.confidence,
    },
  });

  return successResponse({
    id,
    updated: true,
    updatedAt: new Date().toISOString(),
  });
}
