# INFRA-001: Playwright E2E Test Infrastructure
## Ultra-Granular Implementation Guide

---

## Overview

**Goal:** Get Playwright running so we can write E2E tests
**Total Time:** ~2 hours across all steps
**Outcome:** `npm run test:e2e` executes and passes one sample test

---

## Agent Types

| Agent | Role | Works In |
|-------|------|----------|
| **Frontend Agent** | React, TypeScript, npm packages | `frontend/` directory |
| **Config Agent** | Configuration files, tooling setup | Root or config files |
| **Test Agent** | Writing test files, test utilities | `tests/` directories |

---

## Step-by-Step Execution

---

### Step 1 of 8: Install Playwright Package
**Agent:** Frontend Agent
**Time:** 2 minutes
**Directory:** `frontend/`

**Instruction to Agent:**
```
Install Playwright Test as a dev dependency in the frontend project.

Run this command:
npm install -D @playwright/test

Do not run the Playwright installer wizard yet.
```

**Verification:**
- [ ] `package.json` has `@playwright/test` in devDependencies
- [ ] `node_modules/@playwright` exists

**Commit Message:** `chore: add playwright test dependency`

---

### Step 2 of 8: Install Playwright Browsers
**Agent:** Frontend Agent  
**Time:** 3-5 minutes (downloads browsers)
**Directory:** `frontend/`

**Instruction to Agent:**
```
Install the Playwright browsers (Chromium, Firefox, WebKit).

Run this command:
npx playwright install

This downloads the browser binaries Playwright needs.
```

**Verification:**
- [ ] Command completes without errors
- [ ] Browsers downloaded (check output mentions chromium, firefox, webkit)

**Commit Message:** `chore: install playwright browsers`

---

### Step 3 of 8: Create Playwright Config File
**Agent:** Config Agent
**Time:** 5 minutes
**Directory:** `frontend/`

**Instruction to Agent:**
```
Create a Playwright configuration file at frontend/playwright.config.ts

The config should:
1. Set baseURL to http://localhost:5173 (Vite dev server)
2. Use only Chromium for now (faster, add others later)
3. Set reasonable timeouts
4. Configure test directory as tests/e2e
5. Enable retries only in CI
6. Set up HTML reporter for local, plus CI-friendly output
```

**File to Create:** `frontend/playwright.config.ts`
```typescript
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  // Look for test files in this directory
  testDir: './tests/e2e',
  
  // Run tests in parallel
  fullyParallel: true,
  
  // Fail the build on CI if you accidentally left test.only
  forbidOnly: !!process.env.CI,
  
  // Retry on CI only
  retries: process.env.CI ? 2 : 0,
  
  // Limit parallel workers on CI
  workers: process.env.CI ? 1 : undefined,
  
  // Reporter configuration
  reporter: process.env.CI 
    ? [['html'], ['github']] 
    : [['html', { open: 'never' }]],
  
  // Shared settings for all projects
  use: {
    // Base URL for all tests
    baseURL: 'http://localhost:5173',
    
    // Collect trace when retrying a failed test
    trace: 'on-first-retry',
    
    // Screenshot on failure
    screenshot: 'only-on-failure',
  },

  // Configure browser
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    // Add these later for cross-browser testing:
    // {
    //   name: 'firefox',
    //   use: { ...devices['Desktop Firefox'] },
    // },
    // {
    //   name: 'webkit',
    //   use: { ...devices['Desktop Safari'] },
    // },
  ],

  // Run local dev server before starting tests
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:5173',
    reuseExistingServer: !process.env.CI,
    timeout: 120 * 1000,
  },
});
```

**Verification:**
- [ ] File exists at `frontend/playwright.config.ts`
- [ ] No TypeScript errors

**Commit Message:** `chore: add playwright configuration`

---

### Step 4 of 8: Create Test Directory Structure
**Agent:** Config Agent
**Time:** 2 minutes
**Directory:** `frontend/`

**Instruction to Agent:**
```
Create the E2E test directory structure:

frontend/
└── tests/
    └── e2e/
        ├── fixtures/       # Test data and setup utilities
        ├── flows/          # Complete workflow tests (later)
        └── pages/          # Page-specific tests (later)

Create these directories. Add a .gitkeep file in each empty directory.
```

**Commands:**
```bash
mkdir -p tests/e2e/fixtures
mkdir -p tests/e2e/flows
mkdir -p tests/e2e/pages
touch tests/e2e/fixtures/.gitkeep
touch tests/e2e/flows/.gitkeep
touch tests/e2e/pages/.gitkeep
```

**Verification:**
- [ ] Directory structure exists
- [ ] `.gitkeep` files in empty directories

**Commit Message:** `chore: create e2e test directory structure`

---

### Step 5 of 8: Create Test Utilities File
**Agent:** Test Agent
**Time:** 10 minutes
**Directory:** `frontend/tests/e2e/`

**Instruction to Agent:**
```
Create a test utilities file with helper functions we'll use across all E2E tests.

For now, include:
1. A login helper function (placeholder - we'll implement properly later)
2. Type definitions for test scenarios
3. Base URL constant

This file will grow as we add more tests.
```

**File to Create:** `frontend/tests/e2e/fixtures/test-utils.ts`
```typescript
import { Page, expect } from '@playwright/test';

/**
 * Standard test user credentials
 * TODO: Replace with test account or environment variables
 */
export const TEST_USER = {
  username: 'testuser',
  password: 'testpass123',
};

/**
 * Login to the application
 * 
 * @param page - Playwright page object
 * @param credentials - Optional override credentials
 */
export async function login(
  page: Page, 
  credentials?: { username: string; password: string }
): Promise<void> {
  const { username, password } = credentials ?? TEST_USER;
  
  // Navigate to login page
  await page.goto('/admin/login');
  
  // Fill login form
  await page.getByLabel(/username/i).fill(username);
  await page.getByLabel(/password/i).fill(password);
  
  // Submit
  await page.getByRole('button', { name: /log in|sign in/i }).click();
  
  // Wait for redirect to dashboard or main page
  await expect(page).not.toHaveURL(/login/);
}

/**
 * Logout of the application
 */
export async function logout(page: Page): Promise<void> {
  // Click user menu or logout button
  await page.getByRole('button', { name: /logout|sign out/i }).click();
  
  // Verify we're back at login
  await expect(page).toHaveURL(/login/);
}

/**
 * Wait for API calls to complete
 * Useful after actions that trigger backend requests
 */
export async function waitForApi(page: Page): Promise<void> {
  // Wait for network to be idle (no requests for 500ms)
  await page.waitForLoadState('networkidle');
}

/**
 * Clear any test data created during a test
 * TODO: Implement when we have test data seeding
 */
export async function cleanupTestData(): Promise<void> {
  // Placeholder - will call backend cleanup endpoint
  console.log('Cleanup placeholder - implement when backend ready');
}

/**
 * Test scenario types for seeding
 */
export type TestScenario = 
  | 'empty'                    // Clean slate
  | 'basic'                    // Some sample data
  | 'low-stock-with-allocations'  // For demand pegging tests
  | 'production-in-progress'   // For production tests
  | 'production-mto'           // MTO production order
  | 'production-with-shortage' // Production blocked by materials
  | 'so-with-blocking-issues'  // Sales order with problems
  | 'full-demand-chain'        // Complete SO->PO->Materials chain
  | 'full-production-context'; // Complete production context

/**
 * Seed test data for a specific scenario
 * TODO: Implement when we have backend seeding endpoint
 */
export async function seedTestScenario(scenario: TestScenario): Promise<void> {
  // Placeholder - will call backend seeding endpoint
  console.log(`Seeding scenario: ${scenario} - implement when backend ready`);
}
```

**Verification:**
- [ ] File exists at `frontend/tests/e2e/fixtures/test-utils.ts`
- [ ] No TypeScript errors
- [ ] Exports are accessible

**Commit Message:** `feat: add e2e test utility functions`

---

### Step 6 of 8: Create First Sample Test
**Agent:** Test Agent
**Time:** 10 minutes
**Directory:** `frontend/tests/e2e/`

**Instruction to Agent:**
```
Create the first E2E test that verifies the app loads correctly.

This is a smoke test - just checking that:
1. The app starts
2. The login page renders
3. Basic elements are visible

Keep it simple. We just want to verify Playwright is working.
```

**File to Create:** `frontend/tests/e2e/app-loads.spec.ts`
```typescript
import { test, expect } from '@playwright/test';

test.describe('Application Smoke Tests', () => {
  
  test('app loads and displays login page', async ({ page }) => {
    // Navigate to the app
    await page.goto('/');
    
    // Should redirect to login (or show login)
    // Adjust this based on your actual app behavior
    await expect(page).toHaveURL(/login|admin/);
  });

  test('login page has required elements', async ({ page }) => {
    await page.goto('/admin/login');
    
    // Check for username field
    await expect(page.getByLabel(/username|email/i)).toBeVisible();
    
    // Check for password field  
    await expect(page.getByLabel(/password/i)).toBeVisible();
    
    // Check for submit button
    await expect(page.getByRole('button', { name: /log in|sign in|submit/i })).toBeVisible();
  });

  test('page has correct title', async ({ page }) => {
    await page.goto('/admin/login');
    
    // Check page title contains FilaOps or your app name
    await expect(page).toHaveTitle(/FilaOps|Admin|Login/i);
  });

});
```

**Verification:**
- [ ] File exists at `frontend/tests/e2e/app-loads.spec.ts`
- [ ] No TypeScript errors

**Commit Message:** `test: add initial smoke tests for app loading`

---

### Step 7 of 8: Add NPM Scripts
**Agent:** Config Agent
**Time:** 5 minutes
**Directory:** `frontend/`

**Instruction to Agent:**
```
Add npm scripts to package.json for running Playwright tests.

Add these scripts:
1. test:e2e - Run all E2E tests headless
2. test:e2e:ui - Open Playwright UI for interactive testing
3. test:e2e:debug - Run tests with headed browser for debugging
4. test:e2e:report - Show the HTML test report
```

**Edit:** `frontend/package.json` - add to "scripts" section:
```json
{
  "scripts": {
    // ... existing scripts ...
    "test:e2e": "playwright test",
    "test:e2e:ui": "playwright test --ui",
    "test:e2e:debug": "playwright test --headed --debug",
    "test:e2e:report": "playwright show-report"
  }
}
```

**Verification:**
- [ ] `npm run test:e2e` is recognized as a command
- [ ] All four scripts are in package.json

**Commit Message:** `chore: add playwright npm scripts`

---

### Step 8 of 8: Run Tests and Verify Setup
**Agent:** Frontend Agent
**Time:** 5 minutes
**Directory:** `frontend/`

**Instruction to Agent:**
```
Run the E2E tests to verify everything is set up correctly.

First, make sure the dev server can start:
npm run dev

In another terminal, run the tests:
npm run test:e2e

Expected outcome:
- Tests should run
- They may FAIL if login page elements don't match exactly
- That's OK - we just need Playwright to execute

If tests fail due to element selectors:
- Note what's different
- Update the selectors in app-loads.spec.ts to match actual app

If tests fail due to connection issues:
- Verify dev server is running on port 5173
- Check baseURL in playwright.config.ts
```

**Troubleshooting Common Issues:**

| Issue | Solution |
|-------|----------|
| "Could not connect to localhost:5173" | Start dev server first: `npm run dev` |
| "Timeout waiting for element" | Selectors don't match - inspect actual page |
| "Browser not found" | Run `npx playwright install` again |
| TypeScript errors | Check tsconfig includes tests directory |

**Verification:**
- [ ] `npm run test:e2e` executes without crashing
- [ ] Playwright shows test results (pass or fail)
- [ ] HTML report generates in `playwright-report/`

**Commit Message:** `test: verify playwright setup working`

---

## Final Checklist

After completing all 8 steps:

- [ ] Playwright installed in package.json
- [ ] Browsers downloaded
- [ ] playwright.config.ts exists and is valid
- [ ] Directory structure: tests/e2e/{fixtures,flows,pages}
- [ ] test-utils.ts has login helper
- [ ] app-loads.spec.ts has smoke tests
- [ ] npm scripts added
- [ ] Tests execute (even if some fail on selectors)

---

## Handoff to Next Ticket

Once INFRA-001 is complete, the next ticket is:

**INFRA-002: Setup pytest for Backend API Testing**
- Agent: Backend Agent
- Similar granularity breakdown needed
- Will create test factories for seeding data

---

## Notes for Agents

1. **Don't over-engineer** - This is just setup. Keep it minimal.
2. **Commit after each step** - Small, atomic commits
3. **Note any issues** - If selectors don't match, document what they should be
4. **Don't fix the app** - If login page is broken, note it, don't fix it in this ticket
5. **Ask if stuck** - If a step is unclear, ask rather than guess
