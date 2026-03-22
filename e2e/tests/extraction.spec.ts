import { test, expect } from '@playwright/test';
import { mockExtractionPolling, mockRecipeDetail } from '../helpers/api-mock';
import { EXTRACTION_STAGES, EXTRACTION_FAILED } from '../fixtures/extraction';
import { MOCK_RECIPE } from '../fixtures/recipe';

test.describe('추출 진행 페이지', () => {
  test('타임라인 단계가 표시된다', async ({ page }) => {
    await mockExtractionPolling(page, [EXTRACTION_STAGES[0]]);
    await page.goto('/extractions/ext-001');
    await expect(page.getByText('레시피를 만들고 있어요')).toBeVisible();
    await expect(page.getByText('URL 확인')).toBeVisible();
    await expect(page.getByText('자막 수집')).toBeVisible();
    await expect(page.getByText('레시피 구조화')).toBeVisible();
  });

  test('추출 완료 시 레시피 페이지로 리다이렉트', async ({ page }) => {
    await mockExtractionPolling(page, EXTRACTION_STAGES);
    await mockRecipeDetail(page, MOCK_RECIPE);
    await page.goto('/extractions/ext-001');
    await page.waitForURL(/\/recipes\//, { timeout: 15_000 });
    expect(page.url()).toContain('/recipes/test-recipe-001');
  });

  test('추출 실패 시 에러 메시지 표시', async ({ page }) => {
    await mockExtractionPolling(page, [EXTRACTION_FAILED]);
    await page.goto('/extractions/ext-002');
    await expect(
      page.getByRole('heading', { name: '레시피 영상이 아닙니다' }),
    ).toBeVisible();
    await expect(
      page
        .getByRole('button', { name: '홈으로 돌아가기' })
        .or(page.getByRole('link', { name: '홈으로 돌아가기' })),
    ).toBeVisible();
  });
});
