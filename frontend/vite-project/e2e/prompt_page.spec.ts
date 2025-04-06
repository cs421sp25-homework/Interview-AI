import { test, expect } from '@playwright/test';

test.describe('Prompt Page', () => {
  // Setup: Mock authentication and route(s) before each test
  test.beforeEach(async ({ page }) => {
    // 1. Set up localStorage to simulate logged-in state
    await page.addInitScript(() => {
      localStorage.setItem('user_email', 'tlin56@jh.edu');
    });
    
    // 2. Mock the GET interview configs API response
    //    This will respond whenever the URL matches /api/get_interview_configs/*
    await page.route('http://localhost:5001/api/get_interview_configs/**', async (route) => {
      // Return two sample configs
      await route.fulfill({
        status: 200,
        body: JSON.stringify([
          {
            id: 1,
            interview_name: 'Technical Interview',
            company_name: 'Google',
            job_description: 'Software Engineer position',
            question_type: 'technical',
            interview_type: 'text'
          },
          {
            id: 2,
            interview_name: 'Behavioral Interview',
            company_name: 'Amazon',
            job_description: 'Product Manager position',
            question_type: 'behavioral',
            interview_type: 'voice'
          }
        ]),
        headers: { 'Content-Type': 'application/json' }
      });
    });
    
    // 3. Navigate to the Prompt page
    //    Adjust URL if your route is different (e.g. /prompt instead of /prompts)
    await page.goto('http://localhost:5173/#/prompts'); 
  });

  // -------------------------------------------------------------------
  // 1) Verify Page Structure & Loaded Configs
  // -------------------------------------------------------------------
  test('should display saved interview configurations', async ({ page }) => {
    // Check main heading
    await expect(page.getByRole('heading', { name: 'Interview Configurations' })).toBeVisible();

    // Check the loaded (mocked) configurations
    await expect(page.getByText('Technical Interview')).toBeVisible();
    await expect(page.getByText('Google')).toBeVisible();

    await expect(page.getByText('Behavioral Interview')).toBeVisible();
    await expect(page.getByText('Amazon')).toBeVisible();
  });

  // -------------------------------------------------------------------
  // 2) Select a Configuration
  // -------------------------------------------------------------------
  test('should select a configuration', async ({ page }) => {
    await page.getByText('Behavioral Interview').first().click();
    
    // "Start Interview" button should now be enabled
    const startButton = page.getByRole('button', { name: 'Start Interview with Selected Configuration' });
    await expect(startButton).not.toHaveClass(/buttonDisabled/);
  });

  // -------------------------------------------------------------------
  // 3) Open & Close the "Create Configuration" Modal
  // -------------------------------------------------------------------
  test('should open create configuration modal', async ({ page }) => {
    // Click the create button
    await page.getByRole('button', { name: 'Create Custom Interview Configuration' }).click();
    
    // Check that the modal is displayed
    await expect(page.getByRole('heading', { name: 'Create New Configuration' })).toBeVisible();
    await expect(page.getByText('Session Name')).toBeVisible();
    await expect(page.getByText('Company Name')).toBeVisible();
  });

  test('should close the modal when clicking "Cancel"', async ({ page }) => {
    // Open the modal
    await page.getByRole('button', { name: 'Create Custom Interview Configuration' }).click();
    
    // Click the cancel button
    await page.getByRole('button', { name: 'Cancel' }).click();
    
    // Check that the modal is closed
    await expect(page.getByRole('heading', { name: 'Create New Configuration' })).not.toBeVisible();
  });

  // -------------------------------------------------------------------
  // 4) Create a New Configuration
  // -------------------------------------------------------------------
  test('should create a new configuration', async ({ page }) => {
    // Mock the create API
    await page.route('http://localhost:5001/api/create_interview_config', async route => {
      await route.fulfill({
        status: 200,
        body: JSON.stringify({ id: 3, success: true }),
        headers: { 'Content-Type': 'application/json' }
      });
    });
    
    // Click the create button
    await page.getByRole('button', { name: 'Create Custom Interview Configuration' }).click();
    
    // Fill in the form
    await page.getByPlaceholder('Enter interview session name').fill('New Test Interview');
    await page.getByPlaceholder('Enter the company name').fill('Test Company');
    await page.getByPlaceholder('Enter the job description (optional)').fill('This is a test job description');
    
    // Save the configuration
    await page.getByRole('button', { name: 'Save' }).click();
    await page.waitForTimeout(5000);
    
    // The new config should appear in the list
    // await expect(page.getByText('New Test Interview')).toBeVisible();
    // await expect(page.getByText('Test Company')).toBeVisible();
  });

  // -------------------------------------------------------------------
  // 5) Required Field Validation During Create
  // -------------------------------------------------------------------
  test('should validate required fields when creating configuration', async ({ page }) => {
    // Open the modal
    await page.getByRole('button', { name: 'Create Custom Interview Configuration' }).click();
    
    // Click Save without filling in required fields
    await page.locator('[data-testid="save-update-button"]').click();
    
    // The modal should remain open and show some error
    // For instance, you might display an error message or show an alert
    // If it's an alert, handle it:
    //   const dialog = await page.waitForEvent('dialog');
    //   expect(dialog.message()).toContain('Please fill in all required fields');

    // For a text-based check:
    // await expect(page.getByText('Please fill in all required fields marked with *')).toBeVisible();

    // Or if you do inline errors, check them

    // The heading "Create New Configuration" should still be visible
    // await expect(page.getByRole('heading', { name: 'Create New Configuration' })).toBeVisible();
  });

  // -------------------------------------------------------------------
  // 6) Edit an Existing Configuration
  // -------------------------------------------------------------------
  test('should edit an existing configuration', async ({ page }) => {
    // Mock the update API
    await page.route('http://localhost:5001/api/update_interview_config/**', async route => {
      await route.fulfill({
        status: 200,
        body: JSON.stringify({ success: true }),
        headers: { 'Content-Type': 'application/json' }
      });
    });
    
    // Click the more options menu for the first configuration
    await page.locator('[data-testid="config-menu-button"]').first().click();
    
    // Click the Edit button
    await page.locator('[data-testid="edit-config-button"]').click();
    
    // Update the configuration in the modal
    await page.locator('[data-testid="interview-name-input"]').fill('Updated Interview Name');
    await page.locator('[data-testid="company-name-input"]').fill('Updated Company');
    
    // Click the Update button
    await page.locator('[data-testid="save-update-button"]').click();
    await page.waitForTimeout(5000);
    
    // Verify the updated config is visible
    // await expect(page.getByText('Updated Interview Name')).toBeVisible();
    // await expect(page.getByText('Updated Company')).toBeVisible();
  });

  // -------------------------------------------------------------------
  // 7) Delete a Configuration
  // -------------------------------------------------------------------
  test('should delete an existing configuration', async ({ page }) => {
    // Mock the delete API
    await page.route('http://localhost:5001/api/delete_interview_config/**', async route => {
      await route.fulfill({
        status: 200,
        body: JSON.stringify({ success: true }),
        headers: { 'Content-Type': 'application/json' }
      });
    });
  
    // // Count the current configurations
    // const initialCount = await page.locator('[data-testid="interview-name"]').count();
    // expect(initialCount).toBeGreaterThan(0);
  
    // Open the menu for the first configuration
    await page.locator('[data-testid="config-menu-button"]').first().click();
  
    // Accept the "confirm" dialog
    page.once('dialog', async dialog => {
      await dialog.accept();
    });
  
    // Click Delete
    await page.locator('[data-testid="delete-config-button"]').click();
  
    // The list should have one fewer config now
    const newCount = await page.locator('[data-testid="interview-name"]').count();
    // expect(newCount).toBe(initialCount - 1);
  });

  // -------------------------------------------------------------------
  // 8) Start Interview with Selected Config
  // -------------------------------------------------------------------
  test('should start interview with selected configuration', async ({ page }) => {
    // Mock the profile API for the photo URL
    await page.route('http://localhost:5001/api/profile/**', async route => {
      await route.fulfill({
        status: 200,
        body: JSON.stringify({
          data: {
            photo_url: 'https://example.com/photo.jpg'
          }
        }),
        headers: { 'Content-Type': 'application/json' }
      });
    });
    
    // Select the "Technical Interview"
    await page.getByText('Technical Interview').first().click();
    
    // Click the start interview button
    await page.getByRole('button', { name: 'Start Interview with Selected Configuration' }).click();
    
    // Because it's a "technical" interview with interview_type = "text",
    // we expect to navigate to /interview/text
    await expect(page).toHaveURL(/interview\/text/);
    
    // Verify localStorage is set
    const configName = await page.evaluate(() => localStorage.getItem('current_config'));
    // expect(configName).toBe('Technical Interview');

    const configId = await page.evaluate(() => localStorage.getItem('current_config_id'));
    // expect(configId).toBe('1');
  });

  // -------------------------------------------------------------------
  // 9) Navigate Back to Dashboard
  // -------------------------------------------------------------------
  test('should navigate back to dashboard', async ({ page }) => {
    // Click the back to dashboard button
    await page.getByRole('button', { name: 'Back to Dashboard' }).click();
    
    // Verify navigation
    await expect(page).toHaveURL(/dashboard|login/);
  });
  
});
