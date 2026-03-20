import { errorResponse, successResponse } from '@/lib/api/response';
import {
  ExtractionErrorCode,
  getExtractionErrorMessage,
} from '@/lib/extraction/errors';
import { getExtraction } from '@/lib/extraction/service';

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  const extraction = await getExtraction(id);

  if (!extraction) {
    return errorResponse(
      ExtractionErrorCode.VIDEO_NOT_FOUND,
      '추출 작업을 찾을 수 없습니다.',
      404,
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
    return successResponse({
      extractionId: extraction.id,
      status: extraction.status,
    });
  }

  return successResponse({
    extractionId: extraction.id,
    status: extraction.status,
    stage: extraction.stage,
  });
}
