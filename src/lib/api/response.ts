import { NextResponse } from 'next/server';

import {
  getExtractionErrorCategory,
  isExtractionErrorCode,
  type ExtractionErrorCategory,
} from '@/lib/extraction/errors';

export type ApiErrorCategory = ExtractionErrorCategory;

export interface ApiErrorResponse {
  error: string;
  code: string;
  category: ApiErrorCategory;
}

function inferGenericErrorCategory(status: number): ApiErrorCategory {
  if (status >= 500) {
    return 'internal_error';
  }

  if (status === 429) {
    return 'upstream_error';
  }

  return 'user_error';
}

function resolveErrorCategory(
  code: string,
  status: number,
): ApiErrorCategory {
  if (isExtractionErrorCode(code)) {
    return getExtractionErrorCategory(code);
  }

  return inferGenericErrorCategory(status);
}

export function errorResponse(
  code: string,
  message: string,
  status: number,
) {
  return NextResponse.json<ApiErrorResponse>(
    {
      error: message,
      code,
      category: resolveErrorCategory(code, status),
    },
    { status },
  );
}

export function successResponse<T>(data: T, status = 200) {
  return NextResponse.json<T>(data, { status });
}
