import { test, expect } from '@playwright/test';

test.describe('User Dashboard', () => {
  // Setup: Mock authentication before each test
  test.beforeEach(async ({ page }) => {
    // Set up localStorage to simulate logged-in state
    await page.addInitScript(() => {
      localStorage.setItem('user_email', 'tlin56@jh.edu');
    });
    
    // Mock the profile API response
    await page.route('http://localhost:5001/api/profile/**', async route => {
      await route.fulfill({
        status: 200,
        body: JSON.stringify({
          data: {
            first_name: 'Timothy',
            last_name: 'Lin',
            email: 'tlin56@jh.edu',
            job_title: 'Software Engineer',
            interviews_completed: 5,
            resume_reviews: 3,
            created_at: '2023-01-15T00:00:00.000Z'
          }
        })
      });
    });
    
    // Navigate to the dashboard
    await page.goto('/#/dashboard');
  });

  test('should display user profile information', async ({ page }) => {
    // Check that the user's name is displayed
    await expect(page.getByText('Timothy Lin')).toBeVisible();
    
    // Check that the stats are displayed
    await expect(page.getByText('Interviews Completed')).toBeVisible();
    // await expect(page.getByText('5', { exact: true })).toBeVisible();
    await expect(page.getByText('Resume Reviews')).toBeVisible();
    // await expect(page.getByText('3', { exact: true })).toBeVisible();
    await expect(page.getByText('Member Since')).toBeVisible();
  });

  test('should display action cards', async ({ page }) => {
    // Check that the Start Interview card is displayed
    await expect(page.getByRole('heading', { name: 'Start Interview' })).toBeVisible();
    await expect(page.getByText('Start With Customized Configuration')).toBeVisible();
    
    // Check that the Start Now card is displayed
    await expect(page.getByRole('heading', { name: 'History' })).toBeVisible();
    await expect(page.getByText('View your past interview sessions')).toBeVisible();
  });

  test('should navigate to prompts page when clicking Start Now', async ({ page }) => {
    // Click the Start Now button
    await page.getByRole('button', { name: 'Start Now', exact: true }).first().click();
    
    // Verify navigation to prompts page
    await expect(page).toHaveURL(/prompts/);
  });

}); 