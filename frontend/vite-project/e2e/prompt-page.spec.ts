import { test, expect } from '@playwright/test';

test.describe('Prompt Page', () => {
  // Setup: Mock authentication before each test
  test.beforeEach(async ({ page }) => {
    // Set up localStorage to simulate logged-in state
    await page.addInitScript(() => {
      localStorage.setItem('user_email', 'tlin56@jh.edu');
    });
    
    // Mock the interview configs API response
    await page.route('http://localhost:5001/api/get_interview_configs/**', async route => {
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
        ])
      });
    });
    
    // Navigate to the prompts page
    await page.goto('/#/prompts');
  });

  test('should display saved interview configurations', async ({ page }) => {
    // Check that the page title is displayed
    await expect(page.getByRole('heading', { name: 'Interview Configurations' })).toBeVisible();
    
    // Check that the saved configurations are displayed
    await expect(page.getByText('Technical Interview')).toBeVisible();
    await expect(page.getByText('Google')).toBeVisible();
    await expect(page.getByText('Behavioral Interview')).toBeVisible();
    await expect(page.getByText('Amazon')).toBeVisible();
  });

  test('should select a configuration', async ({ page }) => {
    // Click on a configuration to select it
    await page.getByText('Technical Interview').first().click();
    
    // Check that the Start Interview button is enabled
    const startButton = page.getByRole('button', { name: 'Start Interview with Selected Configuration' });
    await expect(startButton).not.toHaveClass(/buttonDisabled/);
  });

  test('should open create configuration modal', async ({ page }) => {
    // Click the create button
    await page.getByRole('button', { name: 'Create Custom Interview Configuration' }).click();
    
    // Check that the modal is displayed
    await expect(page.getByRole('heading', { name: 'Create New Configuration' })).toBeVisible();
    await expect(page.getByText('Session Name')).toBeVisible();
    await expect(page.getByText('Company Name')).toBeVisible();
  });

  test('should create a new configuration', async ({ page }) => {
    // Mock the create API
    await page.route('http://localhost:5001/api/create_interview_config', async route => {
      await route.fulfill({
        status: 200,
        body: JSON.stringify({ id: 3, success: true })
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
    
    // Check that the new configuration is displayed
    await expect(page.getByText('New Test Interview')).toBeVisible();
    await expect(page.getByText('Test Company')).toBeVisible();
  });

  test('should edit an existing configuration', async ({ page }) => {
    // Mock the update API
    await page.route('http://localhost:5001/api/update_interview_config/**', async route => {
      await route.fulfill({
        status: 200,
        body: JSON.stringify({ success: true })
      });
    });
    
    // Click the more options menu for the first configuration
    await page.locator('[data-testid="config-menu-button"]').first().click();
    
    // Click the Edit button in the dropdown menu
    await page.locator('[data-testid="edit-config-button"]').click();
    
    // Update the configuration in the modal
    await page.locator('[data-testid="interview-name-input"]').fill('Updated Interview Name');
    await page.locator('[data-testid="company-name-input"]').fill('Updated Company');
    
    // Click the Update button
    await page.locator('[data-testid="save-update-button"]').click();
    
    // Wait for the API request to complete
    // await page.waitForResponse(response => 
    //   response.url().includes('/api/update_interview_config') && 
    //   response.status() === 200
    // );
    
    // Verify the configuration was updated
    await expect(page.getByText('Updated Interview Name')).toBeVisible();
    await expect(page.getByText('Updated Company')).toBeVisible();
  });

  test('should delete an existing configuration', async ({ page }) => {
    // Mock the delete API
    await page.route('http://localhost:5001/api/delete_interview_config/**', async route => {
      await route.fulfill({
        status: 200,
        body: JSON.stringify({ success: true })
      });
    });
  
    // Store the number of configurations before deletion
    const initialCount = await page.locator('[data-testid="interview-name"]').count();
  
    // Click the more options menu for the first configuration
    await page.locator('[data-testid="config-menu-button"]').first().click();
  
    // Setup a listener to handle the confirmation dialog and accept it
    page.once('dialog', async dialog => {
      await dialog.accept();
    });
  
    // Click the Delete button in the dropdown menu which triggers the browser confirmation dialog
    await page.locator('[data-testid="delete-config-button"]').click();
  
    // Wait for the API request to complete
    // await page.waitForResponse(response => 
    //   response.url().includes('/api/delete_interview_config') && 
    //   response.status() === 200
    // );
  
  });
  

  test('should start interview with selected configuration', async ({ page }) => {
    // Mock the profile API for photo URL
    await page.route('http://localhost:5001/api/profile/**', async route => {
      await route.fulfill({
        status: 200,
        body: JSON.stringify({
          data: {
            photo_url: 'https://example.com/photo.jpg'
          }
        })
      });
    });
    
    // Select a configuration
    await page.getByText('Technical Interview').first().click();
    
    // Click the start interview button
    await page.getByRole('button', { name: 'Start Interview with Selected Configuration' }).click();
    
    // Verify navigation to the interview page
    await expect(page).toHaveURL(/interview\/text/);
    
    // Verify localStorage is set correctly
    const configName = await page.evaluate(() => localStorage.getItem('current_config'));
    expect(configName).toBe('Technical Interview');
    
    const configId = await page.evaluate(() => localStorage.getItem('current_config_id'));
    expect(configId).toBe('1');
  });

  test('should navigate back to dashboard', async ({ page }) => {
    // Click the back to dashboard button
    await page.getByRole('button', { name: 'Back to Dashboard' }).click();
    
    // Verify navigation to dashboard
    await expect(page).toHaveURL(/dashboard|login/);
  });

  test('should validate required fields when creating configuration', async ({ page }) => {
    // Click the create button
    await page.getByRole('button', { name: 'Create Custom Interview Configuration' }).click();
    
    // Try to save without filling required fields
    await page.locator('[data-testid="save-update-button"]').click();
    
    await page.getByText('Session Name').isVisible();
    
    // Modal should still be open
    await expect(page.getByRole('heading', { name: 'Create New Configuration' })).toBeVisible();
  });

  test('should close modal when clicking cancel', async ({ page }) => {
    // Click the create button
    await page.getByRole('button', { name: 'Create Custom Interview Configuration' }).click();
    
    // Click the cancel button
    await page.getByRole('button', { name: 'Cancel' }).click();
    
    // Check that the modal is closed
    await expect(page.getByRole('heading', { name: 'Create New Configuration' })).not.toBeVisible();
  });
}); 