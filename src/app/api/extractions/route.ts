import { NextRequest } from 'next/server';

import { errorResponse, successResponse } from '@/lib/api/response';
import {
  ExtractionErrorCode,
  getExtractionErrorMessage,
  getExtractionErrorStatus,
} from '@/lib/extraction/errors';
import { createExtraction } from '@/lib/extraction/service';

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as {
      youtubeUrl?: string;
      forceReExtract?: boolean;
    };

    if (!body.youtubeUrl) {
      return errorResponse(
        ExtractionErrorCode.INVALID_URL,
        getExtractionErrorMessage(ExtractionErrorCode.INVALID_URL),
        getExtractionErrorStatus(ExtractionErrorCode.INVALID_URL),
      );
    }

    const extraction = await createExtraction(body.youtubeUrl, {
      forceReExtract: body.forceReExtract,
    });

    return successResponse(
      {
        extractionId: extraction.extractionId,
        status: extraction.status,
      },
      202,
    );
  } catch (error) {
    if (
      error instanceof Error &&
      'code' in error &&
      typeof error.code === 'string'
    ) {
      return errorResponse(
        error.code,
        error.message,
        'status' in error && typeof error.status === 'number'
          ? error.status
          : 500,
      );
    }

    return errorResponse(
      ExtractionErrorCode.INTERNAL_ERROR,
      getExtractionErrorMessage(ExtractionErrorCode.INTERNAL_ERROR),
      getExtractionErrorStatus(ExtractionErrorCode.INTERNAL_ERROR),
    );
  }
}
