import { errorResponse, successResponse } from '@/lib/api/response';
import {
  ExtractionErrorCode,
  getExtractionErrorMessage,
  getExtractionErrorStatus,
} from '@/lib/extraction/errors';
import { getRecipe } from '@/lib/recipe/service';

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
