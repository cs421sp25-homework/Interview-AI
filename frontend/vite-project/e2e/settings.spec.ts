import { test, expect } from '@playwright/test';

test.describe('Settings Page', () => {
  // Increase the test timeout for this test suite
  test.setTimeout(60000);

  // Setup: Mock authentication before each test
  test.beforeEach(async ({ page }) => {
    // Set up localStorage to simulate logged-in state
    await page.addInitScript(() => {
      localStorage.setItem('user_email', 'tlin56@jh.edu');
      // Add any other required authentication tokens
      localStorage.setItem('isAuthenticated', 'true');
    });
    
    // Mock the profile API response to prevent loading state
    await page.route('**/api/profile/**', async route => {
      await route.fulfill({
        status: 200,
        body: JSON.stringify({
          data: {
            first_name: 'Test',
            last_name: 'User',
            email: 'test@example.com',
            job_title: 'Software Engineer',
            phone: '1234567890',
            key_skills: ['JavaScript', 'React', 'TypeScript'],
            linkedin_url: 'https://linkedin.com/in/testuser',
            github_url: 'https://github.com/testuser',
            portfolio_url: 'https://testuser.dev',
            photo_url: null,
            education_history: [
              {
                institution: 'Test University',
                degree: 'Computer Science',
                dates: '2018-2022',
                location: 'New York, NY',
                description: 'Graduated with honors'
              }
            ],
            resume_experience: [
              {
                title: 'Software Engineer',
                organization: 'Tech Company',
                dates: '2022-Present',
                location: 'San Francisco, CA',
                description: 'Developing web applications'
              }
            ]
          }
        })
      });
    });
    
    // Navigate to the settings page
    await page.goto('/#/settings');
    
    // Wait for a fixed time instead of waiting for a specific element
    // This gives the page time to load completely
    await page.waitForTimeout(5000);
  });

  test('should display user profile information', async ({ page }) => {
    // Check that the form fields are populated with user data
    await expect(page.getByTestId('first-name-input')).toHaveValue('Test');
    await expect(page.getByTestId('last-name-input')).toHaveValue('User');
    await expect(page.getByTestId('email-input')).toHaveValue('tlin56@jh.edu');
    await expect(page.getByTestId('phone-input')).toHaveValue('1234567890');
  
    // Check that links are populated
    await expect(page.getByTestId('linkedin-input')).toHaveValue('https://linkedin.com/in/testuser');
    await expect(page.getByTestId('github-input')).toHaveValue('https://github.com/testuser');
    await expect(page.getByTestId('portfolio-input')).toHaveValue('https://testuser.dev');
  
    // Check that education section is displayed
    await expect(page.getByTestId('education-title-0')).toBeVisible();
    await expect(page.getByTestId('institution-input-0')).toHaveValue('Test University');
  
    // Check that experience section is displayed
    await expect(page.getByTestId('experience-title-0')).toBeVisible();
    await expect(page.getByTestId('title-input-0')).toHaveValue('Software Engineer');
  });
  

  test('should update basic profile information', async ({ page }) => {
    // Update basic information
    await page.getByTestId('first-name-input').fill('Updated');
    await page.getByTestId('last-name-input').fill('User');
    await page.getByTestId('job-title-input').fill('Senior Developer');
    await page.getByTestId('phone-input').fill('9876543210');
    
    // Update skills
    
    // Click save button using test ID
    await page.getByTestId('save-changes-button').click();
    
    // Verify navigation to dashboard after save
    await expect(page).toHaveURL(/dashboard|login/);
  });

  test('should validate form fields', async ({ page }) => {
    // Enter invalid data
    await page.getByTestId('first-name-input').fill('');
    await page.getByTestId('email-input').fill('invalid-email');
    await page.getByTestId('phone-input').fill('123');
    await page.getByTestId('linkedin-input').fill('invalid-url');
    
    // Try to save using test ID
    await page.getByTestId('save-changes-button').click();
    
    // Check for validation errors
    await expect(page.getByText('First name must be at least 2 characters')).toBeVisible();
    await expect(page.getByText('Invalid email address')).toBeVisible();
    await expect(page.getByText('Invalid phone number')).toBeVisible();
    await expect(page.getByText('Invalid URL')).toBeVisible();
    
    // Should not navigate away
    await expect(page).toHaveURL(/settings/);
  });

  test('should add new education entry', async ({ page }) => {
    // Get initial count of education entries
    const initialEduCount = await page.getByTestId(/education-title-\d+/).count();
    
    // Click add education button
    await page.getByRole('button', { name: 'Add Education' }).click();
    
    // Verify new education entry is added
    const newEduCount = await page.getByTestId(/education-title-\d+/).count();
    expect(newEduCount).toBe(initialEduCount + 1);
    
    // Fill in the new education entry
    const newIndex = initialEduCount;
    await page.getByTestId(`institution-input-${newIndex}`).fill('New School');
    await page.getByTestId(`degree-input-${newIndex}`).fill('New Degree');
    
    // Save changes using test ID
    await page.getByTestId('save-changes-button').click();
    
    // Verify navigation to dashboard
    await expect(page).toHaveURL(/dashboard/);
  });

  test('should delete education entry', async ({ page }) => {
    // Get initial count of education entries
    const initialEduCount = await page.getByTestId(/education-title-\d+/).count();
    
    // Click delete button on first education entry
    await page.getByTestId('trash').first().click();
    
    // Verify education entry is deleted
    const newEduCount = await page.getByTestId(/education-title-\d+/).count();
    expect(newEduCount).toBe(initialEduCount - 1);
  });

  test('should add new experience entry', async ({ page }) => {
    // Get initial count of experience entries
    const initialExpCount = await page.getByTestId(/experience-title-\d+/).count();
    
    // Click add experience button
    await page.getByRole('button', { name: 'Add Experience' }).click();
    
    // Verify new experience entry is added
    const newExpCount = await page.getByTestId(/experience-title-\d+/).count();
    expect(newExpCount).toBe(initialExpCount + 1);
    
    // Fill in the new experience entry
    const newIndex = initialExpCount;
    await page.getByTestId(`title-input-${newIndex}`).fill('New Position');
    await page.getByTestId(`organization-input-${newIndex}`).fill('New Company');
    
    // Save changes using test ID
    await page.getByTestId('save-changes-button').click();
    
    // Verify navigation to dashboard
    await expect(page).toHaveURL(/dashboard/);
  });

  test('should delete experience entry', async ({ page }) => {
    // Get initial count of experience entries
    const initialExpCount = await page.getByTestId(/experience-title-\d+/).count();
    
    // Click delete button on first experience entry
    // Using nth() to get the trash icon in the experience section
    // The first trash is in education, so we need to get the one after all education entries
    await page.getByTestId('trash').nth(initialExpCount).click();
    
    // Verify experience entry is deleted
    const newExpCount = await page.getByTestId(/experience-title-\d+/).count();
    expect(newExpCount).toBe(initialExpCount - 1);
  });

  test('should navigate back to dashboard', async ({ page }) => {
    // Click back to dashboard button
    await page.getByRole('button', { name: 'Back to Dashboard' }).click();
    
    // Verify navigation to dashboard
    await expect(page).toHaveURL(/dashboard/);
  });
});
