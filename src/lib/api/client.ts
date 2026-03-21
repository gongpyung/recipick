import type { ExtractionStage, ExtractionStatus } from '@/lib/extraction/types';
import type { RecipeDetails, RecentRecipeListItem } from '@/lib/recipe/service';

export interface ApiErrorPayload {
  error: string;
  code: string;
  category: 'user_error' | 'upstream_error' | 'internal_error';
}

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly status: number,
    public readonly category: ApiErrorPayload['category'] = 'internal_error',
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export interface ExtractionResponse {
  extractionId: string;
  status: ExtractionStatus;
  stage?: ExtractionStage | null;
  recipeId?: string;
  errorCode?: string;
  message?: string;
}

export interface CreateExtractionResponse {
  extractionId: string;
  status: ExtractionStatus;
}

export interface RecipeUpdatePayload {
  title: string;
  baseServings: number | null;
  ingredients: RecipeDetails['ingredients'];
  steps: RecipeDetails['steps'];
  tips: string[];
  warnings: RecipeDetails['warnings'];
  confidence: RecipeDetails['confidence'];
}

export interface UpdateRecipeResponse {
  id: string;
  updated: boolean;
  updatedAt: string;
}

async function parseJson<T>(response: Response): Promise<T> {
  return (await response.json()) as T;
}

export async function apiFetch<T>(
  url: string,
  options?: RequestInit,
): Promise<T> {
  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options?.headers ?? {}),
    },
  });

  if (!response.ok) {
    const payload = await parseJson<ApiErrorPayload>(response).catch(() => null);

    throw new ApiError(
      payload?.error ?? '요청 처리에 실패했습니다.',
      payload?.code ?? 'UNKNOWN_ERROR',
      response.status,
      payload?.category ?? 'internal_error',
    );
  }

  return parseJson<T>(response);
}

export async function createExtraction(
  youtubeUrl: string,
  forceReExtract = false,
): Promise<CreateExtractionResponse> {
  return apiFetch<CreateExtractionResponse>('/api/extractions', {
    method: 'POST',
    body: JSON.stringify({
      youtubeUrl,
      forceReExtract,
    }),
  });
}

export async function getExtraction(id: string): Promise<ExtractionResponse> {
  return apiFetch<ExtractionResponse>(`/api/extractions/${id}`);
}

export async function getRecipe(id: string): Promise<RecipeDetails> {
  return apiFetch<RecipeDetails>(`/api/recipes/${id}`);
}

export async function getRecentRecipes(): Promise<{
  items: RecentRecipeListItem[];
}> {
  return apiFetch<{ items: RecentRecipeListItem[] }>(
    '/api/recipes?scope=recent',
  );
}

export async function updateRecipe(
  id: string,
  data: RecipeUpdatePayload,
): Promise<UpdateRecipeResponse> {
  return apiFetch<UpdateRecipeResponse>(`/api/recipes/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}
