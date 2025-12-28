import { test as base, Page } from '@playwright/test';
import { E2E_CONFIG } from '../config';

/**
 * Auth fixture - logs in as admin before tests that need authentication
 */
export const test = base.extend<{ authenticatedPage: Page }>({
  authenticatedPage: async ({ page }, use) => {
    // Go to login page
    await page.goto('/admin/login');

    // Fill login form
    await page.fill('input[type="email"]', E2E_CONFIG.email);
    await page.fill('input[type="password"]', E2E_CONFIG.password);

    // Submit and wait for navigation to complete
    await Promise.all([
      page.waitForURL('/admin**', { timeout: 10000 }),
      page.click('button[type="submit"]')
    ]);

    // Wait for page to fully load and localStorage to be set
    // The navigation confirms login succeeded, give React time to update localStorage
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(500); // Small delay for React state updates

    // Use the authenticated page
    await use(page);
  },
});

export { expect } from '@playwright/test';

/**
 * Test data generators
 */
export const testData = {
  customer: {
    email: () => `test-${Date.now()}@example.com`,
    firstName: 'Test',
    lastName: 'Customer',
    company: 'Test Company LLC',
    phone: '555-0100',
  },
  product: {
    sku: () => `TEST-${Date.now()}`,
    name: 'Test Product',
    category: 'Finished Goods',
    sellingPrice: '29.99',
  },
};
