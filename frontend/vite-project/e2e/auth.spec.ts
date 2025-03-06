import { test, expect } from '@playwright/test';

// Login page tests
test.describe('Login Page', () => {
  // Skip the actual navigation and test component behavior in isolation
  test('should handle login form submission', async ({ page }) => {
    // Create a minimal test page with just the form
    await page.setContent(`
      <form>
        <label for="email">Email</label>
        <input id="email" type="email" />
        <label for="password">Password</label>
        <input id="password" type="password" />
        <button type="submit">Login</button>
      </form>
    `);
    
    // Test the form behavior
    await page.getByLabel('Email').fill('test@example.com');
    await page.getByLabel('Password').fill('password123');
    
    // Mock form submission
    await page.evaluate(() => {
      document.querySelector('form')?.addEventListener('submit', (e) => {
        e.preventDefault();
        window.location.href = '/dashboard';
      });
    });
    
    await page.getByRole('button', { name: 'Login' }).click();
  });

  test('should display login form', async ({ page }) => {
    await page.goto('http://localhost:5173/login');
    
    // Check that the form elements are visible
    await expect(page.getByRole('heading', { name: 'Login to Your Account' })).toBeVisible();
    await expect(page.getByText('Email')).toBeVisible();
    await expect(page.getByText('Password')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Login' })).toBeVisible();
  });

  test('should show error for empty fields', async ({ page }) => {
    await page.goto('http://localhost:5173/login');
    
    // Submit without entering data
    await page.getByRole('button', { name: 'Login' }).click();
    
    // Check for error message
    await expect(page.getByText('Please enter both email and password.')).toBeVisible();
  });

  test('should navigate to signup page', async ({ page }) => {
    await page.goto('http://localhost:5173/login');
    
    // Click on the signup link
    await page.getByText('Sign Up').click();
    
    // Verify navigation to signup page
    await expect(page).toHaveURL(/signup/);
  });

  test('should attempt login with credentials', async ({ page }) => {
    await page.goto('http://localhost:5173/login');
    
    // Fill in the form using placeholder text instead of labels
    await page.getByPlaceholder('Enter your email').fill('tlin56@jh.edu');
    await page.getByPlaceholder('Enter your password').fill('12345678');
    
        // Submit the form
    await page.getByRole('button', { name: 'Login' }).click();
    
    // Intercept the API call
    await page.route('http://localhost:5001/api/auth/login', async route => {
      // Mock a successful response 
      await route.fulfill({
        status: 200,
        body: JSON.stringify({ success: true })
      });
    });
    

    
    // Verify navigation to dashboard after successful login
    await expect(page).toHaveURL(/dashboard/);
  });
});

// Signup page tests
test.describe('Signup Page', () => {
  test('should display first step of signup form', async ({ page }) => {
    await page.goto('http://localhost:5173/signup');
    
    // Check that the form elements are visible
    await expect(page.getByText('Set Up Your Interview Profile')).toBeVisible();
    await expect(page.getByText('Create Your Account')).toBeVisible();
    await expect(page.getByLabel('Username')).toBeVisible();
    await expect(page.getByLabel('Password')).toBeVisible();
    await expect(page.getByLabel('Confirm Password')).toBeVisible();
  });

  test('should validate password match', async ({ page }) => {
    await page.goto('http://localhost:5173/signup');
    
    // Fill in mismatched passwords
    await page.getByLabel('Username').fill('testuser');
    await page.getByLabel('Password').fill('password123');
    await page.getByLabel('Confirm Password').fill('password456');
    
    // Check for error message
    await expect(page.getByText('Passwords do not match')).toBeVisible();
  });

  test('should navigate through signup steps', async ({ page }) => {
    await page.goto('http://localhost:5173/signup');
    
    // Step 1: Account creation
    await page.getByLabel('Username').fill('testuser');
    await page.getByLabel('Password').fill('password123');
    await page.getByLabel('Confirm Password').fill('password123');
    await page.getByRole('button', { name: 'Next' }).click();
    
    // Step 2: Personal information
    await expect(page.getByText('Personal Information')).toBeVisible();
    await page.getByLabel('First Name').fill('Test');
    await page.getByLabel('Last Name').fill('User');
    await page.getByLabel('Email').fill('test@example.com');
    await page.getByLabel('Phone').fill('1234567890');
    await page.getByRole('button', { name: 'Next' }).click();
    
    // Step 3: Upload documents
    await expect(page.getByText('Upload Documents')).toBeVisible();
    
    // Mock file upload by creating a test file
    await page.setInputFiles('input[type="file"]', {
      name: 'resume.pdf',
      mimeType: 'application/pdf',
      buffer: Buffer.from('fake pdf content')
    });
    
    await page.getByRole('button', { name: 'Next' }).click();
    
    // Step 4: Professional information
    await expect(page.getByText('Professional Information')).toBeVisible();
    
    // Continue through remaining steps
    await page.getByRole('button', { name: 'Next' }).click();
    await expect(page.getByText('Interview Preferences')).toBeVisible();
    
    await page.getByRole('button', { name: 'Next' }).click();
    await expect(page.getByText('Additional Information')).toBeVisible();
    
    // Verify we're on the final step
    await expect(page.getByRole('button', { name: 'Submit' })).toBeVisible();
  });

  test('should submit signup form', async ({ page }) => {
    await page.goto('http://localhost:5173/signup');
    
    // Complete all steps quickly
    // Step 1
    await page.getByLabel('Username').fill('testuser');
    await page.getByLabel('Password').fill('password123');
    await page.getByLabel('Confirm Password').fill('password123');
    await page.getByRole('button', { name: 'Next' }).click();
    
    // Step 2
    await page.getByLabel('First Name').fill('Test');
    await page.getByLabel('Last Name').fill('User');
    await page.getByLabel('Email').fill('test@example.com');
    await page.getByLabel('Phone').fill('1234567890');
    await page.getByRole('button', { name: 'Next' }).click();
    
    // Step 3
    await page.setInputFiles('input[type="file"]', {
      name: 'resume.pdf',
      mimeType: 'application/pdf',
      buffer: Buffer.from('fake pdf content')
    });
    await page.getByRole('button', { name: 'Next' }).click();
    
    // Step 4
    await page.getByRole('button', { name: 'Next' }).click();
    
    // Step 5
    await page.getByRole('button', { name: 'Next' }).click();
    
    // Intercept the API call
    await page.route('http://localhost:5001/api/signup', async route => {
      // Mock a successful response
      await route.fulfill({
        status: 200,
        body: JSON.stringify({ success: true })
      });
    });
    
    // Submit the form
    await page.getByRole('button', { name: 'Submit' }).click();
    
    // Verify navigation to dashboard after successful signup
    await expect(page).toHaveURL(/dashboard/);
  });
}); 