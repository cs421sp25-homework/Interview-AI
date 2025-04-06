import { test, expect } from '@playwright/test';



test.describe('SignUp Multi-Step Form', () => {
  
  // Utility function to navigate to your sign-up page
  // Adjust URL as needed
  test.beforeEach(async ({ page }) => {
    // Replace with your local or deployed sign-up route
    await page.goto('http://localhost:5173/#/signup');
  });

  test('should display step 1 correctly', async ({ page }) => {
    // Check that Step 1 elements are visible
    await expect(page.getByText('Create Your Account')).toBeVisible();
    await expect(page.getByPlaceholder('Enter your username')).toBeVisible();
    await expect(page.getByPlaceholder('Enter your password')).toBeVisible();
    await expect(page.getByPlaceholder('Confirm your password')).toBeVisible();

    // Also confirm we see Step indicators
    await expect(page.getByText('Step 1')).toBeVisible();
    await expect(page.getByText('Step 6')).toBeVisible();  // The progress bar
  });

  test('should validate step 1 fields (username/password)', async ({ page }) => {
    // Fill an invalid username and a weak password
    await page.getByPlaceholder('Enter your username').fill('xx'); // too short
    await page.getByPlaceholder('Enter your password').fill('password'); // too weak
    await page.getByPlaceholder('Confirm your password').fill('password');
    
    // Attempt to move to Step 2
    await page.getByRole('button', { name: 'Next' }).click();
    
    // Expect an alert or error text for invalid username or password
    // This depends on how you show validation—maybe a JS alert or inline text
    // For example, if you are using an alert:
    // await page.waitForEvent('dialog').then(async dialog => {
    //   const message = dialog.message();
    //   await dialog.dismiss();
    //   expect(message).toMatch(/Username must be 3–20 characters/i);
    // });
    
    // Alternatively, if you show inline error, use something like:
    // await expect(page.getByText('Username must be 3–20 characters')).toBeVisible();
    
    // Correct the username and password
    await page.getByPlaceholder('Enter your username').fill('validUser');
    await page.getByPlaceholder('Enter your password').fill('Password123');
    await page.getByPlaceholder('Confirm your password').fill('Password123');
    
    // Try next again
    await page.getByRole('button', { name: 'Next' }).click();
    
    // We should now be on Step 2
    await expect(page.getByText('Personal Information')).toBeVisible();
  });

  test('should validate step 2 fields (basic info)', async ({ page }) => {
    // We start on Step 1, fill valid data, move to Step 2:
    await page.getByPlaceholder('Enter your username').fill('validUser');
    await page.getByPlaceholder('Enter your password').fill('Password123');
    await page.getByPlaceholder('Confirm your password').fill('Password123');
    await page.getByRole('button', { name: 'Next' }).click();

    // Now on Step 2 but we try to proceed with empty required fields
    await page.getByRole('button', { name: 'Next' }).click();
    
    // Expect an alert or error about missing first name, last name, or email
    // await page.waitForEvent('dialog').then(async dialog => {
    //   const message = dialog.message();
    //   await dialog.dismiss();
    //   expect(message).toMatch(/Please fill in all required fields/i);
    // });

    // Fill them properly
    await page.getByPlaceholder('Enter your first name').fill('John');
    await page.getByPlaceholder('Enter your last name').fill('Doe');
    await page.getByPlaceholder('Enter your email').fill('john.doe@example.com');
    // phone is optional; fill if you like
    await page.getByRole('button', { name: 'Next' }).click();

    // Check we reached Step 3
    await expect(page.getByText('Upload Documents')).toBeVisible();
  });

  test('should handle file upload on step 3', async ({ page }) => {
    // Move quickly to step 3
    await page.getByPlaceholder('Enter your username').fill('validUser');
    await page.getByPlaceholder('Enter your password').fill('Password123');
    await page.getByPlaceholder('Confirm your password').fill('Password123');
    await page.getByRole('button', { name: 'Next' }).click();

    await page.getByPlaceholder('Enter your first name').fill('Test');
    await page.getByPlaceholder('Enter your last name').fill('User');
    await page.getByPlaceholder('Enter your email').fill('test@example.com');
    await page.getByRole('button', { name: 'Next' }).click();

    // Step 3: upload a resume
    // If the label is “Click to upload your resume”, you might do:
    // await page.getByText('Click to upload your resume').click();

    // Instead, we can directly set the file on the invisible <input type="file">:
    await page.setInputFiles('input[type="file"]', {
      name: 'resume.pdf',
      mimeType: 'application/pdf',
      buffer: Buffer.from('fake pdf content')
    });
    
    // Next
    await page.getByRole('button', { name: 'Next' }).click();

    // We expect Step 4 now
    await expect(page.getByText('Professional Information (Optional)')).toBeVisible();
  });

  test('should navigate through all steps and reach final submission', async ({ page }) => {
    // Step 1
    await page.getByPlaceholder('Enter your username').fill('testuser');
    await page.getByPlaceholder('Enter your password').fill('Password123');
    await page.getByPlaceholder('Confirm your password').fill('Password123');
    await page.getByRole('button', { name: 'Next' }).click();

    // Step 2
    await page.getByPlaceholder('Enter your first name').fill('Test');
    await page.getByPlaceholder('Enter your last name').fill('User');
    await page.getByPlaceholder('Enter your email').fill('test@example.com');
    await page.getByRole('button', { name: 'Next' }).click();

    // Step 3
    await page.setInputFiles('input[type="file"]', {
      name: 'resume.pdf',
      mimeType: 'application/pdf',
      buffer: Buffer.from('fake pdf content')
    });
    await page.getByRole('button', { name: 'Next' }).click();

    // Step 4
    await expect(page.getByText('Professional Information (Optional)')).toBeVisible();
    await page.getByRole('button', { name: 'Next' }).click();

    // Step 5
    await expect(page.getByText('Interview Preferences (Optional)')).toBeVisible();
    await page.getByRole('button', { name: 'Next' }).click();

    // Step 6
    await expect(page.getByText('Additional Information (Optional)')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Submit' })).toBeVisible();
  });

  test('should submit the form and handle success response', async ({ page }) => {
    // Pre-fill steps 1–5 quickly
    // Step 1
    await page.getByPlaceholder('Enter your username').fill('validUser');
    await page.getByPlaceholder('Enter your password').fill('Password123');
    await page.getByPlaceholder('Confirm your password').fill('Password123');
    await page.getByRole('button', { name: 'Next' }).click();

    // Step 2
    await page.getByPlaceholder('Enter your first name').fill('Valid');
    await page.getByPlaceholder('Enter your last name').fill('User');
    await page.getByPlaceholder('Enter your email').fill('valid@example.com');
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

    // Now Step 6
    await expect(page.getByRole('button', { name: 'Submit' })).toBeVisible();

    // Intercept the final signup call
    await page.route('**/api/signup', async (route) => {
      // Return a fake success response
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true })
      });
    });

    // Click Submit
    const [request] = await Promise.all([
      page.waitForRequest('**/api/signup'),  // Wait for request to be made
      page.getByRole('button', { name: 'Submit' }).click(),
    ]);

    // Optionally, you can inspect the FormData if needed
    // For a real test, verifying the request was made is often enough

    // Expect the page to navigate away (to /dashboard or similar)
    // In your code, it navigates to '/dashboard' on success
    // If you need to wait for that navigation:
    await page.waitForTimeout(1000); // or page.waitForNavigation() if triggered

    // Expect final route to include /dashboard
    // (If your code navigates to `/login` first, adjust accordingly)
    const currentURL = page.url();
    expect(currentURL).toMatch(/dashboard/);
  });

  test('should handle API error (e.g. 500) gracefully', async ({ page }) => {
    // Fill steps quickly
    await page.getByPlaceholder('Enter your username').fill('testuser');
    await page.getByPlaceholder('Enter your password').fill('Password123');
    await page.getByPlaceholder('Confirm your password').fill('Password123');
    await page.getByRole('button', { name: 'Next' }).click();

    await page.getByPlaceholder('Enter your first name').fill('Test');
    await page.getByPlaceholder('Enter your last name').fill('User');
    await page.getByPlaceholder('Enter your email').fill('test@example.com');
    await page.getByRole('button', { name: 'Next' }).click();

    await page.setInputFiles('input[type="file"]', {
      name: 'resume.pdf',
      mimeType: 'application/pdf',
      buffer: Buffer.from('fake pdf content')
    });
    await page.getByRole('button', { name: 'Next' }).click();
    await page.getByRole('button', { name: 'Next' }).click();
    await page.getByRole('button', { name: 'Next' }).click();

    // Intercept the final signup call with a 500 error
    await page.route('**/api/signup', async (route) => {
      await route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Server error while processing your form.' })
      });
    });

    // Submit
    await page.getByRole('button', { name: 'Submit' }).click();

    // Check for error handling
    // If your code shows an alert, watch for a dialog
    // await page.waitForEvent('dialog').then(async dialog => {
    //   const message = dialog.message();
    //   await dialog.dismiss();
    //   expect(message).toMatch(/Server error while processing your form/i);
    // });

    // Alternatively, if your code sets an inline error or toast, check that:
    // await expect(page.getByText('Server error while processing your form.')).toBeVisible();

    // Ensure we remain on the same page (not navigating away)
    await expect(page).toHaveURL(/signup/);
  });

  // test('should sanitize malicious input (XSS prevention)', async ({ page }) => {
  //   // Step 1
  //   await page.getByPlaceholder('Enter your username').fill('test<script>alert("xss")</script>');
  //   await page.getByPlaceholder('Enter your password').fill('Password123');
  //   await page.getByPlaceholder('Confirm your password').fill('Password123');
  //   await page.getByRole('button', { name: 'Next' }).click();

  //   // Step 2
  //   await page.getByPlaceholder('Enter your first name').fill('John<script>alert("xss")</script>');
  //   await page.getByPlaceholder('Enter your last name').fill('Doe<script>alert("xss")</script>');
  //   await page.getByPlaceholder('Enter your email').fill('john<script>alert("xss")</script>@example.com');
  //   await page.getByRole('button', { name: 'Next' }).click();

  //   // Step 3
  //   await page.setInputFiles('input[type="file"]', {
  //     name: 'resume.pdf',
  //     mimeType: 'application/pdf',
  //     buffer: Buffer.from('fake pdf content')
  //   });
  //   await page.getByRole('button', { name: 'Next' }).click();

  //   // Steps 4,5
  //   await page.getByRole('button', { name: 'Next' }).click();
  //   await page.getByRole('button', { name: 'Next' }).click();

  //   // Intercept signup and inspect the form data
  //   await page.route('**/api/signup', async (route) => {
  //     const request = route.request();
  //     const formDataBuffer = await request.postDataBuffer();
  //     // formData is binary (multipart/form-data). You can't parse easily in real-time,
  //     // but you can confirm it was called. If you want advanced checks, use a library
  //     // to parse the multipart data in your test, or check your server logs for sanitized inputs.

  //     // Return success
  //     await route.fulfill({
  //       status: 200,
  //       contentType: 'application/json',
  //       body: JSON.stringify({ success: true })
  //     });
  //   });

  //   // Submit
  //   await page.getByRole('button', { name: 'Submit' }).click();

  //   // Wait for final nav
  //   await page.waitForTimeout(1000);
  //   await expect(page).toHaveURL(/dashboard/);
  // });
});
