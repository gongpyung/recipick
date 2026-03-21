import { test, expect } from '@playwright/test';
import { mockRecentRecipes } from '../helpers/api-mock';
import { MOCK_RECENT_EMPTY, MOCK_RECENT_RECIPES } from '../fixtures/recipe';

test.describe('히스토리 페이지', () => {
  test('레시피 목록이 표시된다', async ({ page }) => {
    await mockRecentRecipes(page, MOCK_RECENT_RECIPES);
    await page.goto('/history');
    await expect(page.getByRole('heading', { name: '최근 레시피' })).toBeVisible();
    await expect(page.getByText('백종원 김치찌개')).toBeVisible();
    await expect(page.getByText('봄동비빔밥')).toBeVisible();
  });

  test('레시피 없을 때 빈 상태 표시', async ({ page }) => {
    await mockRecentRecipes(page, MOCK_RECENT_EMPTY);
    await page.goto('/history');
    await expect(page.getByText(/아직 추출한 레시피가 없어요/)).toBeVisible();
    await expect(page.getByText('레시피 픽하러 가기')).toBeVisible();
  });
});
