import { test, expect } from '@playwright/test';

test.describe('Home Page', () => {
  test('should display homepage elements', async ({ page }) => {
    // Navigate to the homepage
    await page.goto('/');
    
    // Check that the logo is visible
    await expect(page.getByRole('navigation').getByText('InterviewAI')).toBeVisible();
    
    // Check that the hero section is visible
    await expect(page.getByRole('heading', { name: 'Ace Your Next Interview with AI', exact: true })).toBeVisible();
    
    // Check that the features section is visible
    await expect(page.getByRole('heading', { name: 'AI-Powered Interviews', exact: true })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Personalized Feedback', exact: true })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Industry-Specific', exact: true })).toBeVisible();
    
    // Check that the stats section is visible
    await expect(page.getByText('10,000+')).toBeVisible();
    await expect(page.getByText('95%')).toBeVisible();
    await expect(page.getByText('50+')).toBeVisible();
    
    // Check that the footer is visible
    await expect(page.getByText('© 2025 InterviewAI. All rights reserved.')).toBeVisible();
  });
  
  test('should navigate to login page', async ({ page }) => {
    await page.goto('/');
    
    // Click the login button
    await page.getByRole('button', { name: 'Log In' }).click();
    
    // Verify navigation to login page
    await expect(page).toHaveURL(/login/);
  });
  
  test('should navigate to signup page', async ({ page }) => {
    await page.goto('/');
    
    // Click the signup button
    await page.getByRole('button', { name: 'Start Practicing Now' }).click();
    
    // Verify navigation to signup page
    await expect(page).toHaveURL(/signup/);
  });
}); 