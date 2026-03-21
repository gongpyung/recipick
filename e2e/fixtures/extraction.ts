export const EXTRACTION_CREATE_RESPONSE = {
  extractionId: 'ext-001',
  status: 'queued',
};

export const EXTRACTION_STAGES = [
  { extractionId: 'ext-001', status: 'processing', stage: 'validating_url' },
  { extractionId: 'ext-001', status: 'processing', stage: 'fetching_metadata' },
  { extractionId: 'ext-001', status: 'processing', stage: 'structuring' },
  { extractionId: 'ext-001', status: 'completed', recipeId: 'test-recipe-001' },
];

export const EXTRACTION_FAILED = {
  extractionId: 'ext-002',
  status: 'failed',
  errorCode: 'NON_RECIPE_VIDEO',
  message: '레시피 영상이 아닙니다',
};
