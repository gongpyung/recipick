import { describe, expect, it } from 'vitest';

import { errorResponse, successResponse } from '@/lib/api/response';
import {
  ExtractionErrorCode,
  getExtractionErrorDefinition,
} from '@/lib/extraction/errors';

describe('response helpers', () => {
  it('returns the provided payload and status for success responses', async () => {
    const response = successResponse({ extractionId: 'ext_123' }, 202);

    expect(response.status).toBe(202);
    await expect(response.json()).resolves.toEqual({
      extractionId: 'ext_123',
    });
  });

  it('formats known extraction errors with their mapped category', async () => {
    const error = getExtractionErrorDefinition(
      ExtractionErrorCode.VIDEO_NOT_FOUND,
    );
    const response = errorResponse(
      ExtractionErrorCode.VIDEO_NOT_FOUND,
      error.message,
      error.status,
    );

    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toEqual({
      error: '영상을 찾을 수 없습니다.',
      code: 'VIDEO_NOT_FOUND',
      category: 'upstream_error',
    });
  });

  it('falls back to a generic internal error category for unknown 5xx errors', async () => {
    const response = errorResponse(
      'UNKNOWN_FAILURE',
      '알 수 없는 오류가 발생했습니다.',
      500,
    );

    await expect(response.json()).resolves.toEqual({
      error: '알 수 없는 오류가 발생했습니다.',
      code: 'UNKNOWN_FAILURE',
      category: 'internal_error',
    });
  });
});
