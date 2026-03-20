import { describe, expect, it } from 'vitest';

import {
  ExtractionErrorCode,
  getExtractionErrorDefinition,
  getExtractionErrorMessage,
  getExtractionErrorStatus,
  isExtractionErrorCode,
} from '@/lib/extraction/errors';

describe('extraction error definitions', () => {
  it('maps invalid urls to a user error response', () => {
    expect(getExtractionErrorDefinition(ExtractionErrorCode.INVALID_URL)).toEqual(
      {
        status: 400,
        category: 'user_error',
        message: '유효한 유튜브 URL이 아닙니다.',
      },
    );
  });

  it('exposes helper accessors for mapped status and message', () => {
    expect(getExtractionErrorStatus(ExtractionErrorCode.QUOTA_EXCEEDED)).toBe(
      429,
    );
    expect(getExtractionErrorMessage(ExtractionErrorCode.QUOTA_EXCEEDED)).toBe(
      '유튜브 API 할당량을 초과했습니다. 잠시 후 다시 시도해주세요.',
    );
  });

  it('identifies valid extraction error codes', () => {
    expect(isExtractionErrorCode('INTERNAL_ERROR')).toBe(true);
    expect(isExtractionErrorCode('NOT_A_REAL_CODE')).toBe(false);
  });
});
