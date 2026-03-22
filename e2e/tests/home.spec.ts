import { test, expect } from '@playwright/test';
import { mockExtractionCreate } from '../helpers/api-mock';
import { EXTRACTION_CREATE_RESPONSE } from '../fixtures/extraction';

test.describe('홈 페이지', () => {
  test('hero 타이틀과 입력창이 표시된다', async ({ page }) => {
    await page.goto('/');
    await expect(
      page.getByRole('heading', { name: /당신이 본 요리 영상/ }),
    ).toBeVisible();
    await expect(page.getByPlaceholder(/youtube\.com/i)).toBeVisible();
    await expect(
      page.getByRole('button', { name: '레시피 픽하기' }),
    ).toBeVisible();
  });

  test('빈 URL 제출 시 에러 메시지 표시', async ({ page }) => {
    await page.goto('/');
    const button = page.getByRole('button', { name: '레시피 픽하기' });
    await button.waitFor({ state: 'visible' });
    await button.click();
    // The URL parser returns English: "YouTube URL is required."
    await expect(page.getByText('YouTube URL is required.')).toBeVisible();
  });

  test('잘못된 URL 제출 시 에러 메시지 표시', async ({ page }) => {
    await page.goto('/');
    const input = page.getByPlaceholder(/youtube\.com/i);
    await input.waitFor({ state: 'visible' });
    await input.fill('https://example.com/not-youtube');
    await page.getByRole('button', { name: '레시피 픽하기' }).click();
    // The URL parser returns "Unsupported YouTube URL format."
    await expect(
      page.getByText('Unsupported YouTube URL format.'),
    ).toBeVisible();
  });

  test('유효한 URL 제출 시 추출 페이지로 이동', async ({ page }) => {
    await mockExtractionCreate(page, EXTRACTION_CREATE_RESPONSE);
    await page.goto('/');
    await page
      .getByPlaceholder(/youtube\.com/i)
      .fill('https://www.youtube.com/watch?v=dQw4w9WgXcQ');
    await page.getByRole('button', { name: '레시피 픽하기' }).click();
    await page.waitForURL(/\/extractions\//);
    expect(page.url()).toContain('/extractions/ext-001');
  });

  test('제출 중 버튼이 비활성화되고 로딩 텍스트 표시', async ({ page }) => {
    // Delay the API response so we can observe the loading state
    await page.route('**/api/extractions', async (route) => {
      if (route.request().method() === 'POST') {
        await new Promise((r) => setTimeout(r, 2000));
        return route.fulfill({ status: 202, json: EXTRACTION_CREATE_RESPONSE });
      }
      return route.continue();
    });
    await page.goto('/');
    await page
      .getByPlaceholder(/youtube\.com/i)
      .fill('https://www.youtube.com/watch?v=dQw4w9WgXcQ');
    await page.getByRole('button', { name: '레시피 픽하기' }).click();
    await expect(page.getByText('레시피 추출 중...')).toBeVisible({
      timeout: 3000,
    });
  });
});
