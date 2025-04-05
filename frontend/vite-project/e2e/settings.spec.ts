// import { test, expect } from '@playwright/test';

// /**
//  * Helper function to populate localStorage with "logged in" data.
//  * The 'settingsuser@example.com' or other props can be changed to your real test user.
//  */
// async function setupLocalStorage(page, {
//   userEmail,
//   isAuthenticated
// }: {
//   userEmail?: string;
//   isAuthenticated?: boolean;
// }) {
//   // This script runs in the browser context to set localStorage items
//   await page.addInitScript((args) => {
//     const { userEmail, isAuthenticated } = args;
//     if (userEmail) localStorage.setItem('user_email', userEmail);
//     if (isAuthenticated) localStorage.setItem('isAuthenticated', 'true');
//   }, { userEmail, isAuthenticated });
// }

// test.describe('Settings Page (with localStorage login)', () => {

//   // Increase timeout if needed
//   test.setTimeout(60_000);

//   // ----------------------------------------------------------------------
//   // SCENARIO 1: No user_email => redirect to /login
//   // ----------------------------------------------------------------------
//   test('should redirect to /login if no user_email in localStorage', async ({ page }) => {
//     // Do NOT call setupLocalStorage => user_email is missing
//     // Just navigate
//     await page.goto('http://localhost:5173/#/settings');

//     // Short wait for redirect
//     await page.waitForTimeout(1000);
//     // Expect the app to send us to /login
//     await expect(page).toHaveURL(/login/);
//   });

//   // ----------------------------------------------------------------------
//   // SCENARIO 2: Load Settings with user_email => show profile data
//   // ----------------------------------------------------------------------
//   test.describe('Logged in scenarios', () => {
//     test.beforeEach(async ({ page }) => {
//       // Put user_email & isAuthenticated in localStorage
//       await setupLocalStorage(page, {
//         userEmail: 'settingsuser@example.com',
//         isAuthenticated: true
//       });

//       // Mock the GET /api/profile/:email request
//       await page.route('**/api/profile/settingsuser@example.com', async route => {
//         // Return some example profile data
//         const mockProfileData = {
//           data: {
//             first_name: 'Test',
//             last_name: 'User',
//             email: 'settingsuser@example.com',
//             job_title: 'Software Engineer',
//             phone: '1234567890',
//             key_skills: ['JavaScript', 'React', 'TypeScript'],
//             linkedin_url: 'https://linkedin.com/in/testuser',
//             github_url: 'https://github.com/testuser',
//             portfolio_url: 'https://testuser.dev',
//             photo_url: null,
//             education_history: [
//               {
//                 institution: 'Test University',
//                 degree: 'Computer Science',
//                 dates: '2018-2022',
//                 location: 'New York, NY',
//                 description: 'Graduated with honors'
//               }
//             ],
//             resume_experience: [
//               {
//                 title: 'Software Engineer',
//                 organization: 'Tech Company',
//                 dates: '2022-Present',
//                 location: 'San Francisco, CA',
//                 description: 'Developing web applications'
//               }
//             ]
//           }
//         };
//         await route.fulfill({
//           status: 200,
//           body: JSON.stringify(mockProfileData)
//         });
//       });

//       // Navigate to /settings
//       await page.goto('http://localhost:5173/#/settings');
//       // Wait a moment for the page to load
//       await page.waitForTimeout(2000);
//     });

//     test('should display user profile information', async ({ page }) => {
//       // Confirm the form has the user data from the mock API
//       await expect(page.getByTestId('first-name-input')).toHaveValue('Test');
//       await expect(page.getByTestId('last-name-input')).toHaveValue('User');
//       await expect(page.getByTestId('email-input')).toHaveValue('settingsuser@example.com');
//       await expect(page.getByTestId('job-title-input')).toHaveValue('Software Engineer');
//       await expect(page.getByTestId('phone-input')).toHaveValue('1234567890');

//       // Skills
//       await expect(page.getByTestId('skills-input')).toHaveValue('JavaScript, React, TypeScript');

//       // Social
//       await expect(page.getByTestId('linkedin-input')).toHaveValue('https://linkedin.com/in/testuser');
//       await expect(page.getByTestId('github-input')).toHaveValue('https://github.com/testuser');
//       await expect(page.getByTestId('portfolio-input')).toHaveValue('https://testuser.dev');

//       // Education
//       await expect(page.getByTestId('education-title-0')).toBeVisible();
//       await expect(page.getByTestId('institution-input-0')).toHaveValue('Test University');

//       // Experience
//       await expect(page.getByTestId('experience-title-0')).toBeVisible();
//       await expect(page.getByTestId('title-input-0')).toHaveValue('Software Engineer');
//     });

//     test('should update basic profile information and navigate to /dashboard', async ({ page }) => {
//       // Mock the PUT /api/profile/settingsuser@example.com
//       await page.route('**/api/profile/settingsuser@example.com', async route => {
//         if (route.request().method() === 'PUT') {
//           // Return success
//           await route.fulfill({
//             status: 200,
//             body: JSON.stringify({ success: true })
//           });
//         } else {
//           return route.continue(); // pass through the GET
//         }
//       });

//       // Modify the fields
//       await page.getByTestId('first-name-input').fill('UpdatedFirst');
//       await page.getByTestId('last-name-input').fill('UpdatedLast');
//       await page.getByTestId('phone-input').fill('9876543210');
//       // Suppose we also change skills
//       await page.getByTestId('skills-input').fill('React, Node, Playwright');

//       // Click Save
//       await page.getByTestId('save-changes-button').click();

//       // Expect navigation to /dashboard
//       await expect(page).toHaveURL(/dashboard/);
//     });

//     test('should validate form fields and stay on settings if invalid', async ({ page }) => {
//       // Enter invalid data
//       await page.getByTestId('first-name-input').fill(''); // triggers "First name must be at least 2 chars"
//       await page.getByTestId('email-input').fill('bad-email');
//       await page.getByTestId('phone-input').fill('abc123');

//       // Attempt to save
//       await page.getByTestId('save-changes-button').click();

//       // Expect error messages
//       await expect(page.getByText('First name must be at least 2 characters')).toBeVisible();
//       await expect(page.getByText('Invalid email address')).toBeVisible();
//       await expect(page.getByText('Invalid phone number')).toBeVisible();

//       // Remain on settings
//       await expect(page).toHaveURL(/settings/);
//     });

//     test('should add and remove education entries', async ({ page }) => {
//       // Count initial education
//       const initialEduCount = await page.getByTestId(/education-title-\d+/).count();

//       // Add one
//       await page.getByRole('button', { name: 'Add Education' }).click();
//       const newEduCount = await page.getByTestId(/education-title-\d+/).count();
//       expect(newEduCount).toBe(initialEduCount + 1);

//       // Remove the first or new one
//       await page.getByTestId('trash-edu').first().click();
//       const afterDeleteEduCount = await page.getByTestId(/education-title-\d+/).count();
//       expect(afterDeleteEduCount).toBe(newEduCount - 1);
//     });

//     test('should add and remove experience entries', async ({ page }) => {
//       const initialExpCount = await page.getByTestId(/experience-title-\d+/).count();

//       // Add
//       await page.getByRole('button', { name: 'Add Experience' }).click();
//       const newExpCount = await page.getByTestId(/experience-title-\d+/).count();
//       expect(newExpCount).toBe(initialExpCount + 1);

//       // Remove
//       await page.getByTestId('trash-exp').first().click();
//       const afterDeleteExpCount = await page.getByTestId(/experience-title-\d+/).count();
//       expect(afterDeleteExpCount).toBe(newExpCount - 1);
//     });

//     test('should upload photo, resume, and handle parse results (if your code does immediate parse)', async ({ page }) => {
//       // Mock upload-image
//       let photoUploaded = false;
//       await page.route('**/api/upload-image', async route => {
//         photoUploaded = true;
//         await route.fulfill({
//           status: 200,
//           body: JSON.stringify({ url: 'https://example.com/new_photo.jpg' })
//         });
//       });

//       // Mock parse-resume
//       let resumeParsed = false;
//       await page.route('**/api/parse-resume', async route => {
//         resumeParsed = true;
//         await route.fulfill({
//           status: 200,
//           body: JSON.stringify({
//             resume: {
//               education_history: [
//                 { institution: 'Parsed University', degree: 'Parsed Degree', dates: '2020-2024', location: '', description: '' }
//               ],
//               experience: [
//                 { title: 'Parsed Title', organization: 'ParsedOrg', dates: '2021-2023', location: '', description: '' }
//               ]
//             }
//           })
//         });
//       });

//       // Click "Change Photo"
//       await page.getByTestId('change-photo-button').click();
//       const [photoChooser] = await Promise.all([
//         page.waitForEvent('filechooser'),
//       ]);
//       await photoChooser.setFiles({
//         name: 'avatar.png',
//         mimeType: 'image/png',
//         buffer: Buffer.from('fakeimage')
//       });

//       // Click "Upload Resume"
//       await page.getByTestId('upload-resume-button').click();
//       const [resumeChooser] = await Promise.all([
//         page.waitForEvent('filechooser'),
//       ]);
//       await resumeChooser.setFiles({
//         name: 'resume.pdf',
//         mimeType: 'application/pdf',
//         buffer: Buffer.from('fakepdf')
//       });

//       // Wait short time
//       await page.waitForTimeout(1000);
//       expect(photoUploaded).toBe(true);
//       expect(resumeParsed).toBe(true);

//       // Check that "Parsed University" now appears if your code updates the UI instantly
//       // If your code waits until "Save" to show changes, you might skip
//       await expect(page.getByText('Parsed University')).toBeVisible();
//       await expect(page.getByText('Parsed Title')).toBeVisible();
//     });

//     test('should handle server error on save', async ({ page }) => {
//       // Let GET pass
//       await page.route('**/api/profile/settingsuser@example.com', async route => {
//         if (route.request().method() === 'PUT') {
//           // Return 500
//           await route.fulfill({ status: 500, body: 'Server error' });
//         } else {
//           return route.continue();
//         }
//       });

//       // Attempt to save
//       await page.getByTestId('save-changes-button').click();
//       // Wait
//       await page.waitForTimeout(500);

//       // Remain on settings, see error
//       await expect(page).toHaveURL(/settings/);
//       await expect(page.getByText(/Failed to update profile|Server error/i)).toBeVisible();
//     });

//     test('should navigate back to dashboard when "Back to Dashboard" is clicked', async ({ page }) => {
//       await page.getByRole('button', { name: 'Back to Dashboard' }).click();
//       await expect(page).toHaveURL(/dashboard/);
//     });
//   });

// });
