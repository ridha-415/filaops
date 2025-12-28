import { test as setup, expect } from '@playwright/test';
import { E2E_CONFIG } from './config';
import * as fs from 'fs';

const authFile = './tests/e2e/.auth/user.json';

/**
 * Check if stored JWT token is expired or will expire soon
 * Returns true if token is missing, invalid, or expires within 7 days
 */
function isTokenExpiredOrExpiringSoon(): boolean {
  try {
    if (!fs.existsSync(authFile)) {
      return true; // No auth file exists
    }

    const authData = JSON.parse(fs.readFileSync(authFile, 'utf-8'));
    const tokenValue = authData.origins?.[0]?.localStorage?.find(
      (item: any) => item.name === 'adminToken'
    )?.value;

    if (!tokenValue) {
      return true; // No token found
    }

    // Decode JWT (middle part between dots)
    const payload = JSON.parse(
      Buffer.from(tokenValue.split('.')[1], 'base64').toString()
    );

    if (!payload.exp) {
      return true; // No expiration claim
    }

    // Check if token expires within 7 days (604800 seconds)
    const now = Math.floor(Date.now() / 1000);
    const expiresIn = payload.exp - now;
    const SEVEN_DAYS = 604800;

    if (expiresIn < SEVEN_DAYS) {
      console.log(`[auth] Token expires in ${Math.floor(expiresIn / 86400)} days - re-authenticating`);
      return true;
    }

    return false; // Token is valid
  } catch (error) {
    console.log(`[auth] Error checking token: ${error} - re-authenticating`);
    return true; // On any error, force re-auth
  }
}

setup('authenticate', async ({ page }) => {
  // Skip authentication if token is still valid
  if (!isTokenExpiredOrExpiringSoon()) {
    console.log('[auth] Existing auth token is valid - skipping re-authentication');
    return;
  }

  console.log('[auth] Authenticating test user...');

  // Navigate to login page
  await page.goto('/admin/login');
  await page.waitForLoadState('networkidle');

  // Fill and submit login form
  await page.fill('input[type="email"]', E2E_CONFIG.email);
  await page.fill('input[type="password"]', E2E_CONFIG.password);
  await page.click('button[type="submit"]');

  // Check for login errors before waiting for navigation
  const errorMessage = page.getByText(/incorrect.*password|invalid.*credentials/i);
  const errorVisible = await errorMessage.isVisible({ timeout: 2000 }).catch(() => false);

  if (errorVisible) {
    throw new Error(
      `[auth] Login failed: Test user doesn't exist.\n` +
      `Run: docker-compose -f docker-compose.dev.yml exec backend python scripts/seed_test_data.py`
    );
  }

  // Wait for successful navigation
  await page.waitForURL(/\/admin(?!\/login)/, { timeout: 10000 });

  // Dismiss any promotional modals
  await page.waitForTimeout(500);

  const closeButtons = [
    page.getByRole('button', { name: /don't show|got it|close|dismiss/i }),
    page.locator('button:has-text("×")'),
    page.locator('[aria-label="Close"]'),
  ];

  for (const button of closeButtons) {
    if (await button.isVisible().catch(() => false)) {
      await button.click();
      await page.waitForTimeout(300);
      break; // Only click first visible close button
    }
  }

  // Verify authentication succeeded
  await expect(page.getByText(/dashboard|orders|production/i).first()).toBeVisible({ timeout: 5000 });

  // Save authentication state for reuse
  await page.context().storageState({ path: authFile });

  console.log('[auth] Authentication successful, state saved');
});
