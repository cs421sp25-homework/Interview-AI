import { test, expect } from '@playwright/test';

// Helper to set localStorage (simulate user login) before the page loads
async function setupLocalStorage(page, userEmail) {
  await page.addInitScript((email) => {
    localStorage.setItem('user_email', email);
  }, userEmail);
}

test.describe('GraphPage Tests', () => {
  const BASE_URL = 'http://localhost:5173';
  const USER_EMAIL = 'testuser@example.com';

  // ------------------------------------------------------------------------
  // SCENARIO 1: No user_email => redirect to /login
  // ------------------------------------------------------------------------
  test('should redirect to /login if no user_email in localStorage', async ({ page }) => {
    await page.goto(`${BASE_URL}/#/graph`);
    await page.waitForURL(/login/);
    await expect(page).toHaveURL(/login/);
  });

  // ------------------------------------------------------------------------
  // SCENARIO 2: Load skill stats for radar chart
  // ------------------------------------------------------------------------
  test('should load and display skill stats in radar chart', async ({ page }) => {
    await setupLocalStorage(page, USER_EMAIL);

    // Mock GET /api/overall_scores/email/<email>
    await page.route(`**/api/overall_scores/email/${USER_EMAIL}`, async (route) => {
      const mockData = {
        scores: {
          technical: 0.85,
          communication: 0.72,
          problem_solving: 0.90,
          leadership: 0.65,
          'resume strength': 0.78,
          confidence: 0.80,
        },
      };
      await route.fulfill({
        status: 200,
        body: JSON.stringify(mockData),
        headers: { 'Content-Type': 'application/json' },
      });
    });

    await page.goto(`${BASE_URL}/#/graph`);
    await page.waitForSelector('h1:has-text("Performance Analytics Dashboard")');

    // Check header
    await expect(page.getByRole('heading', { name: 'Performance Analytics Dashboard' })).toBeVisible();

    // Check radar chart title
    await expect(page.getByRole('heading', { name: 'Skill Breakdown' })).toBeVisible();

    // Check radar chart elements (verify data points indirectly via SVG elements)
    await expect(page.locator('svg.recharts-surface')).toBeVisible();
    await expect(page.getByText('Technical Skills')).toBeVisible();
    await expect(page.getByText('Communication')).toBeVisible();
    await expect(page.getByText('Problem Solving')).toBeVisible();
    await expect(page.getByText('Leadership')).toBeVisible();
    await expect(page.getByText('Resume Strength')).toBeVisible();
    await expect(page.getByText('Confidence')).toBeVisible();
  });

  // ------------------------------------------------------------------------
  // SCENARIO 3: Load ELO progress in line chart
  // ------------------------------------------------------------------------
  test('should load and display ELO progress in line chart', async ({ page }) => {
    await setupLocalStorage(page, USER_EMAIL);

    // Mock GET /api/elo/history/<email>
    await page.route(`**/api/elo/history/${USER_EMAIL}`, async (route) => {
      const mockData = {
        success: true,
        data: [
          { date: '2025-04-10T00:00:00Z', score: 1000 },
          { date: '2025-04-15T00:00:00Z', score: 1050 },
        ],
      };
      await route.fulfill({
        status: 200,
        body: JSON.stringify(mockData),
        headers: { 'Content-Type': 'application/json' },
      });
    });

    await page.goto(`${BASE_URL}/#/graph`);
    await page.waitForSelector('h1:has-text("Performance Analytics Dashboard")');

    // Check ELO progress title
    await expect(page.getByRole('heading', { name: 'ELO Progress' })).toBeVisible();

    // Check line chart elements
    await expect(page.locator('svg.recharts-surface').nth(1)).toBeVisible();
  });

  // ------------------------------------------------------------------------
  // SCENARIO 4: Load leaderboard
  // ------------------------------------------------------------------------
  test('should load and display leaderboard', async ({ page }) => {
    await setupLocalStorage(page, USER_EMAIL);

    // Mock GET /api/elo/leaderboard
    await page.route('**/api/elo/leaderboard?limit=10', async (route) => {
      const mockData = {
        success: true,
        data: [
          { rank: 1, name: 'user1@example.com', eloscore: 1200 },
          { rank: 2, name: USER_EMAIL, eloscore: 1100 },
        ],
      };
      await route.fulfill({
        status: 200,
        body: JSON.stringify(mockData),
        headers: { 'Content-Type': 'application/json' },
      });
    });

    await page.goto(`${BASE_URL}/#/graph`);
    await page.waitForSelector('h1:has-text("Performance Analytics Dashboard")');

    // Check leaderboard title
    await expect(page.getByRole('heading', { name: 'Top 10 Leaderboard By ELO Score' })).toBeVisible();

    // Check leaderboard table
    await expect(page.getByRole('table')).toBeVisible();
    await expect(page.getByRole('cell', { name: 'user1@example.com' })).toBeVisible();
    await expect(page.getByRole('cell', { name: '1200' })).toBeVisible();
    await expect(page.getByRole('cell', { name: USER_EMAIL })).toBeVisible();
    await expect(page.getByRole('cell', { name: '1100' })).toBeVisible();
  });

  // ------------------------------------------------------------------------
  // SCENARIO 5: Empty ELO history state
  // ------------------------------------------------------------------------
  test('should display empty state for ELO history', async ({ page }) => {
    await setupLocalStorage(page, USER_EMAIL);

    // Mock GET /api/elo/history/<email> (empty)
    await page.route(`**/api/elo/history/${USER_EMAIL}`, async (route) => {
      await route.fulfill({
        status: 200,
        body: JSON.stringify({ success: true, data: [] }),
        headers: { 'Content-Type': 'application/json' },
      });
    });

    await page.goto(`${BASE_URL}/#/graph`);
    await page.waitForSelector('h1:has-text("Performance Analytics Dashboard")');

    // Check empty state
    await expect(page.getByText('No ELO History Yet')).toBeVisible();
    await expect(page.getByText('Complete your first interview to start tracking your ELO score progress over time.')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Start an Interview' })).toBeVisible();
  });

  // ------------------------------------------------------------------------
  // SCENARIO 6: Empty leaderboard state
  // ------------------------------------------------------------------------
  test('should display empty state for leaderboard', async ({ page }) => {
    await setupLocalStorage(page, USER_EMAIL);

    // Mock GET /api/elo/leaderboard (empty)
    await page.route('**/api/elo/leaderboard?limit=10', async (route) => {
      await route.fulfill({
        status: 200,
        body: JSON.stringify({ success: true, data: [] }),
        headers: { 'Content-Type': 'application/json' },
      });
    });

    await page.goto(`${BASE_URL}/#/graph`);
    await page.waitForSelector('h1:has-text("Performance Analytics Dashboard")');

    // Check empty state
    await expect(page.getByText('No Ranking Data Available')).toBeVisible();
    await expect(page.getByText('Complete interviews to join the global leaderboard and compare your progress with others.')).toBeVisible();
  });

  // ------------------------------------------------------------------------
  // SCENARIO 7: ELO history error state
  // ------------------------------------------------------------------------
  test('should display error state for ELO history', async ({ page }) => {
    await setupLocalStorage(page, USER_EMAIL);

    // Mock GET /api/elo/history/<email> (error)
    await page.route(`**/api/elo/history/${USER_EMAIL}`, async (route) => {
      await route.fulfill({
        status: 500,
        body: JSON.stringify({ error: 'Server error' }),
        headers: { 'Content-Type': 'application/json' },
      });
    });

    await page.goto(`${BASE_URL}/#/graph`);
    await page.waitForSelector('h1:has-text("Performance Analytics Dashboard")');

    // Check error state
    await expect(page.getByText('Failed to load ELO history. Please try again later.')).toBeVisible();
  });

  // ------------------------------------------------------------------------
  // SCENARIO 8: Skill stats fallback to defaults on API failure
  // ------------------------------------------------------------------------
  test('should display default skill stats on API failure', async ({ page }) => {
    await setupLocalStorage(page, USER_EMAIL);

    // Mock GET /api/overall_scores/email/<email> (error)
    await page.route(`**/api/overall_scores/email/${USER_EMAIL}`, async (route) => {
      await route.fulfill({
        status: 500,
        body: JSON.stringify({ error: 'Server error' }),
        headers: { 'Content-Type': 'application/json' },
      });
    });

    await page.goto(`${BASE_URL}/#/graph`);
    await page.waitForSelector('h1:has-text("Performance Analytics Dashboard")');

    // Check radar chart with default values
    await expect(page.getByRole('heading', { name: 'Skill Breakdown' })).toBeVisible();
    await expect(page.locator('svg.recharts-surface')).toBeVisible();
    await expect(page.getByText('Technical Skills')).toBeVisible();
    await expect(page.getByText('Communication')).toBeVisible();
  });

  // ------------------------------------------------------------------------
  // SCENARIO 9: Back navigation
  // ------------------------------------------------------------------------
  test('should navigate back to dashboard', async ({ page }) => {
    await setupLocalStorage(page, USER_EMAIL);

    // Mock GET /api/overall_scores/email/<email> (empty to avoid rendering charts)
    await page.route(`**/api/overall_scores/email/${USER_EMAIL}`, async (route) => {
      await route.fulfill({
        status: 200,
        body: JSON.stringify({ scores: {} }),
        headers: { 'Content-Type': 'application/json' },
      });
    });

    await page.goto(`${BASE_URL}/#/graph`);
    await page.waitForSelector('button:has-text("Back to Dashboard")');

    // Click "Back to Dashboard" button
    await page.getByRole('button', { name: 'Back to Dashboard' }).click();
    await page.waitForURL(/dashboard/);
    await expect(page).toHaveURL(/dashboard/);
  });

  // ------------------------------------------------------------------------
  // SCENARIO 10: Toggle debug mode
  // ------------------------------------------------------------------------
  test('should toggle debug mode and display debug panel', async ({ page }) => {
    await setupLocalStorage(page, USER_EMAIL);

    // Mock GET /api/overall_scores/email/<email> (empty to avoid rendering charts)
    await page.route(`**/api/overall_scores/email/${USER_EMAIL}`, async (route) => {
      await route.fulfill({
        status: 200,
        body: JSON.stringify({ scores: {} }),
        headers: { 'Content-Type': 'application/json' },
      });
    });

    await page.goto(`${BASE_URL}/#/graph`);
    await page.waitForSelector('h1:has-text("Performance Analytics Dashboard")');

    // Debug panel should not be visible initially
    await expect(page.getByText('Debug Info:')).not.toBeVisible();

    // Click debug toggle (the • span next to the title)
    await page.locator('h1:has-text("Performance Analytics Dashboard")').locator('span').click();

    // Check debug panel
    await expect(page.getByText('Debug Info:')).toBeVisible();
    await expect(page.getByText('Skill Data Count: 6')).toBeVisible();

    // Click debug toggle again to hide
    await page.locator('h1:has-text("Performance Analytics Dashboard")').locator('span').click();
    await expect(page.getByText('Debug Info:')).not.toBeVisible();
  });

  // ------------------------------------------------------------------------
  // SCENARIO 11: Loading states for ELO and leaderboard
  // ------------------------------------------------------------------------
  test('should display loading states for ELO and leaderboard', async ({ page }) => {
    await setupLocalStorage(page, USER_EMAIL);

    // Mock GET /api/elo/history/<email> (delayed response)
    await page.route(`**/api/elo/history/${USER_EMAIL}`, async (route) => {
      await new Promise((resolve) => setTimeout(resolve, 1000)); // Simulate delay
      await route.fulfill({
        status: 200,
        body: JSON.stringify({ success: true, data: [] }),
        headers: { 'Content-Type': 'application/json' },
      });
    });

    // Mock GET /api/elo/leaderboard (delayed response)
    await page.route('**/api/elo/leaderboard?limit=10', async (route) => {
      await new Promise((resolve) => setTimeout(resolve, 1000)); // Simulate delay
      await route.fulfill({
        status: 200,
        body: JSON.stringify({ success: true, data: [] }),
        headers: { 'Content-Type': 'application/json' },
      });
    });

    await page.goto(`${BASE_URL}/#/graph`);
    await page.waitForSelector('h1:has-text("Performance Analytics Dashboard")');

    // Check loading states
    await expect(page.getByText('Loading ELO data...')).toBeVisible();
    await expect(page.getByText('Loading leaderboard...')).toBeVisible();
    await expect(page.locator('svg.animate-spin')).toBeVisible();

    // Wait for loading to complete
    await page.waitForSelector('text=No ELO History Yet');
    await expect(page.getByText('Loading ELO data...')).not.toBeVisible();
    await expect(page.getByText('Loading leaderboard...')).not.toBeVisible();
  });
});