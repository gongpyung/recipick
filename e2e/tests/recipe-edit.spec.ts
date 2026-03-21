import { test, expect } from '@playwright/test';
import { mockRecipeDetail, mockRecipeUpdate } from '../helpers/api-mock';
import { MOCK_RECIPE } from '../fixtures/recipe';

test.describe('레시피 편집 모드', () => {
  test.beforeEach(async ({ page }) => {
    await mockRecipeDetail(page, MOCK_RECIPE);
    await mockRecipeUpdate(page);
    await page.goto('/recipes/test-recipe-001');
    await page.getByText('수정하기').click();
    await expect(page.getByText('레시피 수정')).toBeVisible();
  });

  test('저장하기 클릭 시 뷰 모드로 복귀', async ({ page }) => {
    // 제목 변경
    const titleInput = page.locator('input').first();
    await titleInput.clear();
    await titleInput.fill('수정된 김치찌개');
    // 저장
    await page.getByText('저장하기').click();
    // 뷰 모드로 복귀 확인 (편집 헤더 사라짐)
    await expect(page.getByText('레시피 수정')).not.toBeVisible({ timeout: 5_000 });
  });

  test('변경 후 취소 시 확인 다이얼로그 표시', async ({ page }) => {
    const titleInput = page.locator('input').first();
    await titleInput.clear();
    await titleInput.fill('변경된 제목');
    await page.getByText('취소').click();
    await expect(page.getByText('수정 내용을 버리시겠습니까?')).toBeVisible();
    // "계속 수정하기" 클릭 → 편집 유지
    await page.getByText('계속 수정하기').click();
    await expect(page.getByText('레시피 수정')).toBeVisible();
  });

  test('재료 추가/삭제 동작', async ({ page }) => {
    // 현재 재료 수 확인
    const initialCount = await page.locator('input[placeholder="재료명"]').count();
    // 재료 추가
    await page.getByText('재료 추가').click();
    const afterAddCount = await page.locator('input[placeholder="재료명"]').count();
    expect(afterAddCount).toBe(initialCount + 1);
    // 마지막 재료 행에서 삭제 버튼 클릭 — 재료 입력과 같은 행에 있는 trash 버튼 찾기
    const lastIngredientInput = page.locator('input[placeholder="재료명"]').last();
    // 재료 행(rounded-2xl div)에서 trash 버튼을 찾기
    const lastIngredientRow = lastIngredientInput.locator('xpath=ancestor::div[contains(@class,"p-3")]');
    await lastIngredientRow.locator('svg.lucide-trash-2').locator('..').click();
    await expect(page.locator('input[placeholder="재료명"]')).toHaveCount(initialCount);
  });
});
