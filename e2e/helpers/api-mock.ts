import type { Page } from '@playwright/test';

export async function mockExtractionCreate(page: Page, response: object) {
  await page.route('**/api/extractions', (route) => {
    if (route.request().method() === 'POST') {
      return route.fulfill({ status: 202, json: response });
    }
    return route.continue();
  });
}

export async function mockExtractionPolling(page: Page, stages: object[]) {
  let callCount = 0;
  await page.route('**/api/extractions/*', (route) => {
    if (route.request().method() !== 'GET') return route.continue();
    const response = stages[Math.min(callCount++, stages.length - 1)];
    return route.fulfill({ status: 200, json: response });
  });
}

export async function mockRecipeDetail(page: Page, recipe: object) {
  await page.route('**/api/recipes/*', (route) => {
    const url = route.request().url();
    if (route.request().method() === 'GET' && !url.includes('scope=')) {
      return route.fulfill({ status: 200, json: recipe });
    }
    return route.fallback();
  });
}

export async function mockRecipeUpdate(page: Page, response?: object) {
  await page.route('**/api/recipes/*', (route) => {
    if (route.request().method() === 'PATCH') {
      return route.fulfill({
        status: 200,
        json: response ?? { id: 'test-recipe-001', updated: true, updatedAt: new Date().toISOString() },
      });
    }
    return route.fallback();
  });
}

export async function mockRecentRecipes(page: Page, response: object) {
  await page.route('**/api/recipes?scope=recent', (route) => {
    return route.fulfill({ status: 200, json: response });
  });
}

export async function mockRecipeNotFound(page: Page) {
  await page.route('**/api/recipes/*', (route) => {
    if (route.request().method() === 'GET') {
      return route.fulfill({
        status: 404,
        json: { error: '레시피를 찾을 수 없습니다.', code: 'RECIPE_NOT_FOUND', category: 'user_error' },
      });
    }
    return route.fallback();
  });
}
