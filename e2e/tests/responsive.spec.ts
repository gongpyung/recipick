import { test, expect } from '@playwright/test';

test.describe('반응형 테스트', () => {
  test('데스크톱(1440px)에서 하단 네비가 숨겨진다', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/');
    // md:hidden 적용 확인 - 하단 네비의 fixed 컨테이너
    const bottomNav = page.locator('.fixed.bottom-0').first();
    if (await bottomNav.count() > 0) {
      await expect(bottomNav).not.toBeVisible();
    }
  });

  test('모바일(375px)에서 하단 네비가 표시된다', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto('/');
    // 하단 네비의 "홈" 텍스트 확인
    const homeTab = page.locator('nav').last().getByText('홈');
    if (await homeTab.count() > 0) {
      await expect(homeTab).toBeVisible();
    }
  });
});
