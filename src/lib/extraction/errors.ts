export type ExtractionErrorCategory =
  | 'user_error'
  | 'upstream_error'
  | 'internal_error';

export enum ExtractionErrorCode {
  INVALID_URL = 'INVALID_URL',
  UNSUPPORTED_URL = 'UNSUPPORTED_URL',
  VIDEO_NOT_FOUND = 'VIDEO_NOT_FOUND',
  EXTRACTION_NOT_FOUND = 'EXTRACTION_NOT_FOUND',
  RECIPE_NOT_FOUND = 'RECIPE_NOT_FOUND',
  CAPTIONS_NOT_AVAILABLE = 'CAPTIONS_NOT_AVAILABLE',
  INSUFFICIENT_SOURCE_TEXT = 'INSUFFICIENT_SOURCE_TEXT',
  METADATA_FETCH_FAILED = 'METADATA_FETCH_FAILED',
  QUOTA_EXCEEDED = 'QUOTA_EXCEEDED',
  EXTRACTION_TIMEOUT = 'EXTRACTION_TIMEOUT',
  INTERNAL_ERROR = 'INTERNAL_ERROR',
}

export interface ExtractionErrorDefinition {
  status: number;
  category: ExtractionErrorCategory;
  message: string;
}

const EXTRACTION_ERROR_DEFINITIONS: Record<
  ExtractionErrorCode,
  ExtractionErrorDefinition
> = {
  [ExtractionErrorCode.INVALID_URL]: {
    status: 400,
    category: 'user_error',
    message: '유효한 유튜브 URL이 아닙니다.',
  },
  [ExtractionErrorCode.UNSUPPORTED_URL]: {
    status: 422,
    category: 'user_error',
    message: '지원하지 않는 유튜브 URL 형식입니다.',
  },
  [ExtractionErrorCode.VIDEO_NOT_FOUND]: {
    status: 404,
    category: 'upstream_error',
    message: '영상을 찾을 수 없습니다.',
  },
  [ExtractionErrorCode.EXTRACTION_NOT_FOUND]: {
    status: 404,
    category: 'user_error',
    message: '추출 작업을 찾을 수 없습니다.',
  },
  [ExtractionErrorCode.RECIPE_NOT_FOUND]: {
    status: 404,
    category: 'user_error',
    message: '레시피를 찾을 수 없습니다.',
  },
  [ExtractionErrorCode.CAPTIONS_NOT_AVAILABLE]: {
    status: 422,
    category: 'user_error',
    message: '사용 가능한 자막이 없습니다.',
  },
  [ExtractionErrorCode.INSUFFICIENT_SOURCE_TEXT]: {
    status: 422,
    category: 'user_error',
    message: '자막 또는 설명 정보가 부족합니다.',
  },
  [ExtractionErrorCode.METADATA_FETCH_FAILED]: {
    status: 502,
    category: 'upstream_error',
    message: '영상 메타데이터를 가져오지 못했습니다.',
  },
  [ExtractionErrorCode.QUOTA_EXCEEDED]: {
    status: 429,
    category: 'upstream_error',
    message: '유튜브 API 할당량을 초과했습니다. 잠시 후 다시 시도해주세요.',
  },
  [ExtractionErrorCode.EXTRACTION_TIMEOUT]: {
    status: 504,
    category: 'upstream_error',
    message: '추출 처리 시간이 초과되었습니다.',
  },
  [ExtractionErrorCode.INTERNAL_ERROR]: {
    status: 500,
    category: 'internal_error',
    message: '서버 내부 오류가 발생했습니다.',
  },
};

export function isExtractionErrorCode(
  code: string,
): code is ExtractionErrorCode {
  return code in EXTRACTION_ERROR_DEFINITIONS;
}

export function getExtractionErrorDefinition(code: ExtractionErrorCode) {
  return EXTRACTION_ERROR_DEFINITIONS[code];
}

export function getExtractionErrorMessage(code: ExtractionErrorCode) {
  return getExtractionErrorDefinition(code).message;
}

export function getExtractionErrorStatus(code: ExtractionErrorCode) {
  return getExtractionErrorDefinition(code).status;
}

export function getExtractionErrorCategory(code: ExtractionErrorCode) {
  return getExtractionErrorDefinition(code).category;
}
