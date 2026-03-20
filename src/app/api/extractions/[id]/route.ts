import { errorResponse, successResponse } from '@/lib/api/response';
import {
  ExtractionErrorCode,
  getExtractionErrorMessage,
  getExtractionErrorStatus,
} from '@/lib/extraction/errors';
import { getExtraction } from '@/lib/extraction/service';
import { getRecipeIdByExtractionId } from '@/lib/recipe/service';

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  const extraction = await getExtraction(id);

  if (!extraction) {
    return errorResponse(
      ExtractionErrorCode.EXTRACTION_NOT_FOUND,
      getExtractionErrorMessage(ExtractionErrorCode.EXTRACTION_NOT_FOUND),
      getExtractionErrorStatus(ExtractionErrorCode.EXTRACTION_NOT_FOUND),
    );
  }

  if (extraction.status === 'failed') {
    return successResponse({
      extractionId: extraction.id,
      status: extraction.status,
      errorCode: extraction.error_code ?? ExtractionErrorCode.INTERNAL_ERROR,
      message:
        extraction.error_message ??
        getExtractionErrorMessage(ExtractionErrorCode.INTERNAL_ERROR),
    });
  }

  if (extraction.status === 'completed') {
    const recipeId = await getRecipeIdByExtractionId(extraction.id);

    if (!recipeId) {
      return errorResponse(
        ExtractionErrorCode.INTERNAL_ERROR,
        getExtractionErrorMessage(ExtractionErrorCode.INTERNAL_ERROR),
        getExtractionErrorStatus(ExtractionErrorCode.INTERNAL_ERROR),
      );
    }

    return successResponse({
      extractionId: extraction.id,
      status: extraction.status,
      recipeId,
    });
  }

  return successResponse({
    extractionId: extraction.id,
    status: extraction.status,
    stage: extraction.stage,
  });
}
