import { test as baseTest, expect } from '@playwright/test';
import { E2E_CONFIG } from '../config';

/**
 * Full E2E Workflow Test - WITH SCREENSHOTS
 *
 * Tests navigation through main admin sections
 * Run: npm run test:e2e -- --grep "Full Workflow"
 *
 * Screenshots saved to: e2e/screenshots/
 */

// Custom test with auth
const test = baseTest.extend<{ authenticatedPage: any }>({
  authenticatedPage: async ({ page }, use) => {
    await page.goto('/admin/login');
    await page.fill('input[type="email"]', E2E_CONFIG.email);
    await page.fill('input[type="password"]', E2E_CONFIG.password);
    await page.click('button[type="submit"]');
    await page.waitForURL('/admin**', { timeout: E2E_CONFIG.authTimeout });
    await use(page);
  },
});

// Enable screenshots for this file
test.use({ screenshot: 'on' });

test.describe('Full Workflow E2E', () => {
  test('navigate through admin sections', async ({ authenticatedPage: page }) => {
    const timestamp = Date.now();
    const screenshotDir = `e2e/screenshots/workflow-${timestamp}`;

    // Ensure directory exists
    const fs = await import('fs');
    if (!fs.existsSync(screenshotDir)) {
      fs.mkdirSync(screenshotDir, { recursive: true });
    }

    // Step 1: After login, we're at /admin
    await page.waitForLoadState('networkidle');
    await page.screenshot({ path: `${screenshotDir}/01-dashboard.png`, fullPage: true });
    // Step 2: Navigate to Orders
    await page.goto('/admin/orders');
    await expect(page).toHaveURL('/admin/orders');
    await page.waitForLoadState('networkidle');
    await page.screenshot({ path: `${screenshotDir}/02-orders.png`, fullPage: true });

    // Step 3: Navigate to Customers
    await page.goto('/admin/customers');
    await expect(page).toHaveURL('/admin/customers');
    await page.waitForLoadState('networkidle');
    await page.screenshot({ path: `${screenshotDir}/03-customers.png`, fullPage: true });

    // Step 4: Navigate to Items
    await page.goto('/admin/items');
    await expect(page).toHaveURL('/admin/items');
    await page.waitForLoadState('networkidle');
    await page.screenshot({ path: `${screenshotDir}/04-items.png`, fullPage: true });

    // Step 5: Navigate to Production
    await page.goto('/admin/production');
    await expect(page).toHaveURL('/admin/production');
    await page.waitForLoadState('networkidle');
    await page.screenshot({ path: `${screenshotDir}/05-production.png`, fullPage: true });

    // Step 6: Navigate to Bill of Materials
    await page.goto('/admin/bom');
    await expect(page).toHaveURL('/admin/bom');
    await page.waitForLoadState('networkidle');
    await page.screenshot({ path: `${screenshotDir}/06-bom.png`, fullPage: true });

    // Step 7: Back to Dashboard
    await page.goto('/admin');
    await expect(page).toHaveURL('/admin');
    await page.waitForLoadState('networkidle');
    await page.screenshot({ path: `${screenshotDir}/07-final-dashboard.png`, fullPage: true });

    console.log(`Screenshots saved to: ${screenshotDir}`);
  });
});
