import { test, expect } from '@playwright/test';

// Helper to set localStorage (simulate user login) before the page loads
async function setupLocalStorage(page, userEmail: string) {
  await page.addInitScript((email: string) => {
    localStorage.setItem('user_email', email);
  }, userEmail);
}

test.describe('Flashcards Pages Tests', () => {
  const BASE_URL = 'http://localhost:5173';

  // ------------------------------------------------------------------------
  // FlashcardsSelectionPage Tests
  // ------------------------------------------------------------------------

  test.describe('FlashcardsSelectionPage', () => {
    // SCENARIO 1: Navigate to Favorites
    test('should navigate to /flashcards/favorites when clicking Study Favorites', async ({ page }) => {
      await setupLocalStorage(page, 'testuser@example.com');

      await page.goto(`${BASE_URL}/#/flashcards`);
      await page.waitForTimeout(500);

      // Click "Study Favorites" button
      await page.getByRole('button', { name: /Study Favorites/i }).click();
      await page.waitForTimeout(300);

      // Verify navigation
      await expect(page).toHaveURL(`${BASE_URL}/#/flashcards/favorites`);
    });

    // SCENARIO 2: Navigate to Weakest
    test('should navigate to /flashcards/weakest when clicking Study Weakest', async ({ page }) => {
      await setupLocalStorage(page, 'testuser@example.com');

      await page.goto(`${BASE_URL}/#/flashcards`);
      await page.waitForTimeout(500);

      // Click "Study Weakest" button
      await page.getByRole('button', { name: /Study Weakest/i }).click();
      await page.waitForTimeout(300);

      // Verify navigation
      await expect(page).toHaveURL(`${BASE_URL}/#/flashcards/weakest`);
    });

    // SCENARIO 3: Back to Dashboard
    test('should navigate to /dashboard when clicking Back to Dashboard', async ({ page }) => {
      await setupLocalStorage(page, 'testuser@example.com');

      await page.goto(`${BASE_URL}/#/flashcards`);
      await page.waitForTimeout(500);

      // Click "Back to Dashboard" button
      await page.getByRole('button', { name: /Back to Dashboard/i }).click();
      await page.waitForTimeout(300);

      // Verify navigation
      await expect(page).toHaveURL(`${BASE_URL}/#/dashboard`);
    });
  });

  // ------------------------------------------------------------------------
  // FlashcardsPage Tests
  // ------------------------------------------------------------------------

  test.describe('FlashcardsPage', () => {
    // SCENARIO 4: Redirect to Login
    test('should redirect to /login if no user_email in localStorage', async ({ page }) => {
      await page.goto(`${BASE_URL}/#/flashcards/favorites`);
      await page.waitForTimeout(500);
      await expect(page).toHaveURL(/login/);
    });

    // SCENARIO 5: Load Favorite Questions
    test('should load and display favorite questions', async ({ page }) => {
        await setupLocalStorage(page, 'testuser@example.com');
  
        // Mock GET /api/favorite_questions/<email>
        await page.route('**/api/favorite_questions/testuser@example.com', async route => {
          const mockData = {
            data: [
              {
                id: 1,
                question_text: 'What is a closure in JavaScript?',
                created_at: '2025-04-15T10:00:00Z',
                question_type: 'technical',
                answer: 'A closure is a function that retains access to its lexical scope.'
              }
            ]
          };
          await route.fulfill({
            status: 200,
            body: JSON.stringify(mockData),
            headers: { 'Content-Type': 'application/json' }
          });
        });
  
        await page.goto(`${BASE_URL}/#/flashcards/favorites`);
        await page.waitForTimeout(500);
  
        // Verify question in flip card
        await expect(page.locator('._qText_dz9go_515').filter({ hasText: 'What is a closure in JavaScript?' })).toBeVisible();
  
        // Verify question and answer in list
        await expect(page.locator('._question_dz9go_191').filter({ hasText: 'What is a closure in JavaScript?' })).toBeVisible();
        await expect(page.getByRole('textbox').filter({ hasText: 'A closure is a function that retains access to its lexical scope.' })).toBeVisible();
  
        // Verify progress
        await expect(page.getByText('Card 1 / 1')).toBeVisible();
      });

    // SCENARIO 6: Load Weak Questions
    test('should load and display weak questions', async ({ page }) => {
        await setupLocalStorage(page, 'testuser@example.com');
  
        // Mock GET /api/weak_questions/<email>
        await page.route('**/api/weak_questions/testuser@example.com', async route => {
          const mockData = {
            data: [
              {
                id: 1,
                question_text: 'Explain recursion?',
                created_at: '2025-04-15T10:00:00Z',
                question_type: 'technical',
                answer: 'Recursion is when a function calls itself.'
              }
            ]
          };
          await route.fulfill({
            status: 200,
            body: JSON.stringify(mockData),
            headers: { 'Content-Type': 'application/json' }
          });
        });
  
        await page.goto(`${BASE_URL}/#/flashcards/weakest`);
        await page.waitForTimeout(500);
  
        // Verify question in flip card
        await expect(page.locator('._qText_dz9go_515').filter({ hasText: 'Explain recursion?' })).toBeVisible();
  
        // Verify question and answer in list
        await expect(page.locator('._question_dz9go_191').filter({ hasText: 'Explain recursion?' })).toBeVisible();
        await expect(page.getByRole('textbox').filter({ hasText: 'Recursion is when a function calls itself.' })).toBeVisible();
  
        // Verify progress
        await expect(page.getByText('Card 1 / 1')).toBeVisible();
      });
  
    // SCENARIO 7: Empty State
    test('should display empty state when no questions exist', async ({ page }) => {
      await setupLocalStorage(page, 'testuser@example.com');

      // Mock GET /api/favorite_questions/<email> (empty)
      await page.route('**/api/favorite_questions/testuser@example.com', async route => {
        await route.fulfill({
          status: 200,
          body: JSON.stringify({ data: [] }),
          headers: { 'Content-Type': 'application/json' }
        });
      });

      await page.goto(`${BASE_URL}/#/flashcards/favorites`);
      await page.waitForTimeout(500);

      // Verify empty state
      await expect(page.getByText('No favourite questions yet.')).toBeVisible();
    });
  
      // SCENARIO 10: Navigate Cards
      test('should navigate between cards and shuffle', async ({ page }) => {
        await setupLocalStorage(page, 'testuser@example.com');
  
        // Mock GET /api/favorite_questions/<email>
        await page.route('**/api/favorite_questions/testuser@example.com', async route => {
          const mockData = {
            data: [
              {
                id: 1,
                question_text: 'What is a closure in JavaScript?',
                created_at: '2025-04-15T10:00:00Z',
                question_type: 'technical',
                answer: ''
              },
              {
                id: 2,
                question_text: 'Describe a time you led a team?',
                created_at: '2025-04-14T12:00:00Z',
                question_type: 'behavioral',
                answer: ''
              }
            ]
          };
          await route.fulfill({
            status: 200,
            body: JSON.stringify(mockData),
            headers: { 'Content-Type': 'application/json' }
          });
        });
  
        await page.goto(`${BASE_URL}/#/flashcards/favorites`);
        await page.waitForTimeout(500);
  
        // Verify first card
        await expect(page.locator('._qText_dz9go_515').filter({ hasText: 'What is a closure in JavaScript?' })).toBeVisible();
        await expect(page.getByText('Card 1 / 2')).toBeVisible();
  
        // Click "Next"
        await page.getByRole('button', { name: /Next/i }).click();
        await page.waitForTimeout(300);
  
        // Verify second card
        await expect(page.locator('._qText_dz9go_515').filter({ hasText: 'Describe a time you led a team?' })).toBeVisible();
        await expect(page.getByText('Card 2 / 2')).toBeVisible();
  
        // Click "Previous"
        await page.getByRole('button', { name: /Previous/i }).click();
        await page.waitForTimeout(300);
  
        // Verify first card again
        await expect(page.locator('._qText_dz9go_515').filter({ hasText: 'What is a closure in JavaScript?' })).toBeVisible();
        await expect(page.getByText('Card 1 / 2')).toBeVisible();
  
        // Click "Shuffle" (order may change, so verify a valid question)
        await page.getByRole('button', { name: /Shuffle/i }).click();
        await page.waitForTimeout(300);
        const questionText = await page.locator('._qText_dz9go_515').filter({ hasText: /What is a closure in JavaScript?|Describe a time you led a team?/ });
        await expect(questionText).toBeVisible();
        await expect(page.getByText('Card 1 / 2')).toBeVisible();
      });
  
      // SCENARIO 8: Back Navigation
      test('should navigate back to previous page', async ({ page }) => {
        await setupLocalStorage(page, 'testuser@example.com');
  
        // Mock GET /api/favorite_questions/<email>
        await page.route('**/api/favorite_questions/testuser@example.com', async route => {
          const mockData = {
            data: [
              {
                id: 1,
                question_text: 'What is a closure in JavaScript?',
                created_at: '2025-04-15T10:00:00Z',
                question_type: 'technical',
                answer: ''
              }
            ]
          };
          await route.fulfill({
            status: 200,
            body: JSON.stringify(mockData),
            headers: { 'Content-Type': 'application/json' }
          });
        });
  
        // Navigate from a previous page to set history
        await page.goto(`${BASE_URL}/#/flashcards`);
        await page.getByRole('button', { name: /Study Favorites/i }).click();
        await page.waitForTimeout(500);
  
        // Verify question to ensure page loaded
        await expect(page.locator('._qText_dz9go_515').filter({ hasText: 'What is a closure in JavaScript?' })).toBeVisible();
  
        // Click "Back" button
        await page.getByRole('button', { name: /Back/i }).click();
        await page.waitForTimeout(300);
  
        // Verify navigation back to selection page
        await expect(page).toHaveURL(/\/flashcards/);
      });
    });
  });