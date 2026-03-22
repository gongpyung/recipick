import { errorResponse, successResponse } from '@/lib/api/response';
import { listRecentRecipes } from '@/lib/recipe/service';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const scope = searchParams.get('scope');
  const limitParam = searchParams.get('limit');

  if (scope !== 'recent') {
    return errorResponse(
      'INVALID_SCOPE',
      '지원하지 않는 recipes 조회 범위입니다.',
      400,
    );
  }

  let limit: number | undefined;

  if (limitParam !== null) {
    const parsedLimit = Number(limitParam);

    if (
      !Number.isInteger(parsedLimit) ||
      parsedLimit <= 0 ||
      parsedLimit > 50
    ) {
      return errorResponse(
        'INVALID_LIMIT',
        'limit은 1 이상 50 이하의 정수여야 합니다.',
        400,
      );
    }

    limit = parsedLimit;
  }

  return successResponse({
    items: await listRecentRecipes(limit),
  });
}
