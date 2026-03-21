import { test, expect } from '@playwright/test';
import { mockRecipeDetail, mockRecipeNotFound } from '../helpers/api-mock';
import { MOCK_RECIPE, MOCK_RECIPE_NO_SERVINGS } from '../fixtures/recipe';

test.describe('레시피 결과 페이지', () => {
  test('레시피 제목과 재료가 표시된다', async ({ page }) => {
    await mockRecipeDetail(page, MOCK_RECIPE);
    await page.goto('/recipes/test-recipe-001');
    await expect(page.getByRole('heading', { name: '백종원 김치찌개' })).toBeVisible();
    await expect(page.getByText('김치', { exact: true })).toBeVisible();
    await expect(page.getByText('돼지고기', { exact: true })).toBeVisible();
    await expect(page.getByText('두부', { exact: true })).toBeVisible();
  });

  test('조리 단계가 표시된다', async ({ page }) => {
    await mockRecipeDetail(page, MOCK_RECIPE);
    await page.goto('/recipes/test-recipe-001');
    await expect(page.getByText('김치를 적당한 크기로 썬다')).toBeVisible();
    await expect(page.getByText('돼지고기를 볶는다')).toBeVisible();
  });

  test('인분 + 버튼으로 재료량이 변경된다', async ({ page }) => {
    await mockRecipeDetail(page, MOCK_RECIPE);
    await page.goto('/recipes/test-recipe-001');
    // 기본 2인분 → + 클릭 → 3인분
    const plusButton = page.locator('button').filter({ has: page.locator('svg.lucide-plus') }).first();
    await plusButton.click();
    // 3인분이면 김치 300g → 450g
    await expect(page.getByText('450')).toBeVisible();
  });

  test('인분 - 버튼으로 재료량이 변경된다', async ({ page }) => {
    await mockRecipeDetail(page, MOCK_RECIPE);
    await page.goto('/recipes/test-recipe-001');
    const minusButton = page.locator('button').filter({ has: page.locator('svg.lucide-minus') }).first();
    await minusButton.click();
    // 2인분 → 1인분: 김치 300g → 150g
    await expect(page.getByText('150')).toBeVisible();
  });

  test('baseServings null 시 인분 조절 비활성 안내 표시', async ({ page }) => {
    await mockRecipeDetail(page, MOCK_RECIPE_NO_SERVINGS);
    await page.goto('/recipes/test-recipe-002');
    await expect(page.getByText(/인분 조절을 사용할 수 없/)).toBeVisible();
  });

  test('API 에러 시 ErrorDisplay 표시', async ({ page }) => {
    await mockRecipeNotFound(page);
    await page.goto('/recipes/nonexistent');
    await expect(page.getByRole('heading', { name: /오류/ })).toBeVisible();
  });

  test('수정하기 버튼으로 편집 모드 전환', async ({ page }) => {
    await mockRecipeDetail(page, MOCK_RECIPE);
    await page.goto('/recipes/test-recipe-001');
    await page.getByText('수정하기').click();
    await expect(page.getByText('레시피 수정')).toBeVisible();
  });
});
