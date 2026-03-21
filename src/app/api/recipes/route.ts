import { errorResponse, successResponse } from '@/lib/api/response';
import { listRecentRecipes } from '@/lib/recipe/service';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const scope = searchParams.get('scope');

  if (scope !== 'recent') {
    return errorResponse(
      'INVALID_SCOPE',
      '지원하지 않는 recipes 조회 범위입니다.',
      400,
    );
  }

  return successResponse({
    items: await listRecentRecipes(),
  });
}
