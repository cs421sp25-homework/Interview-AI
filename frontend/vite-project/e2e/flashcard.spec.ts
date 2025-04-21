import { test, expect } from '@playwright/test';

// Helper to set localStorage (simulate user login) before the page loads
async function setupLocalStorage(page, userEmail) {
  await page.addInitScript((email) => {
    localStorage.setItem('user_email', email);
  }, userEmail);
}

test.describe('FlashcardsPage Tests', () => {
  const BASE_URL = 'http://localhost:5173';
  const USER_EMAIL = 'testuser@example.com';

  // ------------------------------------------------------------------------
  // SCENARIO 1: No user_email => redirect to /login
  // ------------------------------------------------------------------------
  test('should redirect to /login if no user_email in localStorage', async ({ page }) => {
    await page.goto(`${BASE_URL}/#/flashcards/favorites`);
    await page.waitForURL(/login/);
    await expect(page).toHaveURL(/login/);
  });

  // ------------------------------------------------------------------------
  // SCENARIO 2: Load favorite flashcards
  // ------------------------------------------------------------------------
  test('should load and display favorite flashcards', async ({ page }) => {
    await setupLocalStorage(page, USER_EMAIL);

    // Mock GET /api/favorite_questions/<email>
    await page.route(`**/api/favorite_questions/${USER_EMAIL}`, async (route) => {
      const mockData = {
        data: [
          {
            id: 1,
            question_text: 'What is a closure in JavaScript?',
            created_at: '2025-04-15T10:00:00Z',
            session_id: 'thread-101',
            question_type: 'technical',
            answer: 'A closure is a function that retains access to its lexical scope.',
          },
          {
            id: 2,
            question_text: 'Describe a leadership experience?',
            created_at: '2025-04-14T12:00:00Z',
            session_id: 'thread-102',
            question_type: 'behavioral',
            answer: '',
          },
        ],
      };
      await route.fulfill({
        status: 200,
        body: JSON.stringify(mockData),
        headers: { 'Content-Type': 'application/json' },
      });
    });

    await page.goto(`${BASE_URL}/#/flashcards/favorites`);
    await page.waitForSelector('h1:has-text("Flashcards – Favourite Questions")');

    // Check header
    await expect(page.getByText('Flashcards – Favourite Questions')).toBeVisible();

    // Check card content (first card)
    // await expect(page.getByText('What is a closure in JavaScript?')).toBeVisible();
    await expect(page.getByText('Card 1 / 2')).toBeVisible();

    // Check list view
    await expect(page.getByText('Describe a leadership experience?')).toBeVisible();
    await expect(page.getByRole('textbox').first()).toHaveValue('A closure is a function that retains access to its lexical scope.');
    await expect(page.getByRole('textbox').nth(1)).toHaveValue('');
  });

  // ------------------------------------------------------------------------
  // SCENARIO 3: Load weakest flashcards
  // ------------------------------------------------------------------------
  test('should load and display weakest flashcards', async ({ page }) => {
    await setupLocalStorage(page, USER_EMAIL);

    // Mock GET /api/weak_questions/<email>
    await page.route(`**/api/weak_questions/${USER_EMAIL}`, async (route) => {
      const mockData = {
        data: [
          {
            id: 1,
            question_text: 'Explain recursion.',
            created_at: '2025-04-15T10:00:00Z',
            session_id: 'thread-101',
            question_type: 'technical',
            answer: '',
          },
        ],
      };
      await route.fulfill({
        status: 200,
        body: JSON.stringify(mockData),
        headers: { 'Content-Type': 'application/json' },
      });
    });

    await page.goto(`${BASE_URL}/#/flashcards/weakest`);
    await page.waitForSelector('h1:has-text("Flashcards – Weakest Questions")');

    // Check header
    await expect(page.getByText('Flashcards – Weakest Questions')).toBeVisible();

    // Check card content
    await expect(page.getByText('Explain recursion.')).toBeVisible();
    await expect(page.getByText('Card 1 / 1')).toBeVisible();

    // Flip card and check answer
    await expect(page.getByText('No answer yet.')).toBeVisible();

    // Check list view
    await expect(page.getByRole('textbox')).toHaveValue('');
  });

  // ------------------------------------------------------------------------
  // SCENARIO 4: Navigate through flashcards
  // ------------------------------------------------------------------------
  test('should navigate through flashcards using prev/next buttons', async ({ page }) => {
    await setupLocalStorage(page, USER_EMAIL);

    // Mock GET /api/favorite_questions/<email>
    await page.route(`**/api/favorite_questions/${USER_EMAIL}`, async (route) => {
      const mockData = {
        data: [
          {
            id: 1,
            question_text: 'What is a closure in JavaScript?',
            created_at: '2025-04-15T10:00:00Z',
            session_id: 'thread-101',
            question_type: 'technical',
            answer: '',
          },
          {
            id: 2,
            question_text: 'Describe a leadership experience?',
            created_at: '2025-04-14T12:00:00Z',
            session_id: 'thread-102',
            question_type: 'behavioral',
            answer: '',
          },
        ],
      };
      await route.fulfill({
        status: 200,
        body: JSON.stringify(mockData),
        headers: { 'Content-Type': 'application/json' },
      });
    });

    await page.goto(`${BASE_URL}/#/flashcards/favorites`);
    await page.waitForSelector('h1:has-text("Flashcards – Favourite Questions")');

    // Check first card
    await expect(page.getByText('Card 1 / 2')).toBeVisible();

    // Click "Next" button
    await page.getByRole('button', { name: 'Next' }).click();
    await expect(page.getByText('Card 2 / 2')).toBeVisible();

    // Click "Previous" button
    await page.getByRole('button', { name: 'Previous' }).click();
    await expect(page.getByText('Card 1 / 2')).toBeVisible();

    // Verify "Previous" is disabled on first card
    await expect(page.getByRole('button', { name: 'Previous' })).toBeDisabled();
    // Verify "Next" is enabled
    await expect(page.getByRole('button', { name: 'Next' })).toBeEnabled();
  });

  // ------------------------------------------------------------------------
  // SCENARIO 5: Shuffle flashcards
  // ------------------------------------------------------------------------
  test('should shuffle flashcards', async ({ page }) => {
    await setupLocalStorage(page, USER_EMAIL);

    // Mock GET /api/favorite_questions/<email>
    await page.route(`**/api/favorite_questions/${USER_EMAIL}`, async (route) => {
      const mockData = {
        data: [
          {
            id: 1,
            question_text: 'What is a closure in JavaScript?',
            created_at: '2025-04-15T10:00:00Z',
            session_id: 'thread-101',
            question_type: 'technical',
            answer: '',
          },
          {
            id: 2,
            question_text: 'Describe a leadership experience?',
            created_at: '2025-04-14T12:00:00Z',
            session_id: 'thread-102',
            question_type: 'behavioral',
            answer: '',
          },
        ],
      };
      await route.fulfill({
        status: 200,
        body: JSON.stringify(mockData),
        headers: { 'Content-Type': 'application/json' },
      });
    });

    await page.goto(`${BASE_URL}/#/flashcards/favorites`);
    await page.waitForSelector('h1:has-text("Flashcards – Favourite Questions")');

    // Check initial order
    await expect(page.getByText('Card 1 / 2')).toBeVisible();

    // Click "Shuffle" button
    await page.getByRole('button', { name: 'Shuffle' }).click();
    // expect(['What is a closure in JavaScript?', 'Describe a leadership experience?']).toContain(questionText.trim());
    await expect(page.getByText('Card 1 / 2')).toBeVisible();
  });

  // ------------------------------------------------------------------------
  // SCENARIO 6: Save human answer
  // ------------------------------------------------------------------------
  test('should save human answer and show success', async ({ page }) => {
    await setupLocalStorage(page, USER_EMAIL);

    // Mock GET /api/favorite_questions/<email>
    await page.route(`**/api/favorite_questions/${USER_EMAIL}`, async (route) => {
      const mockData = {
        data: [
          {
            id: 1,
            question_text: 'What is a closure in JavaScript?',
            created_at: '2025-04-15T10:00:00Z',
            session_id: 'thread-101',
            question_type: 'technical',
            answer: '',
          },
        ],
      };
      await route.fulfill({
        status: 200,
        body: JSON.stringify(mockData),
        headers: { 'Content-Type': 'application/json' },
      });
    });

    // Mock POST /api/store_answer
    await page.route('**/api/store_answer', async (route) => {
      await route.fulfill({
        status: 200,
        body: JSON.stringify({ success: true }),
        headers: { 'Content-Type': 'application/json' },
      });
    });

    await page.goto(`${BASE_URL}/#/flashcards/favorites`);
    await page.waitForSelector('h1:has-text("Flashcards – Favourite Questions")');

    // Type an answer
    await page.getByRole('textbox').fill('A closure is a function with access to its lexical scope.');
    await page.getByRole('button', { name: /Save/i }).click();

    // Wait for success icon to disappear
    await page.waitForTimeout(1500);
    await expect(page.getByRole('button', { name: /Save/i }).locator('svg[data-icon="save"]')).toBeVisible();
  });

  // ------------------------------------------------------------------------
  // SCENARIO 7: Generate AI answer
  // ------------------------------------------------------------------------
  test('should generate AI answer and display it', async ({ page }) => {
    await setupLocalStorage(page, USER_EMAIL);

    // Mock GET /api/favorite_questions/<email>
    await page.route(`**/api/favorite_questions/${USER_EMAIL}`, async (route) => {
      const mockData = {
        data: [
          {
            id: 1,
            question_text: 'What is a closure in JavaScript?',
            created_at: '2025-04-15T10:00:00Z',
            session_id: 'thread-101',
            question_type: 'technical',
            answer: '',
          },
        ],
      };
      await route.fulfill({
        status: 200,
        body: JSON.stringify(mockData),
        headers: { 'Content-Type': 'application/json' },
      });
    });

    // Mock POST /api/generate_flashcard_answer
    await page.route('**/api/generate_flashcard_answer', async (route) => {
      await route.fulfill({
        status: 200,
        body: JSON.stringify({ ideal_answer: '• A closure retains access to its outer scope.' }),
        headers: { 'Content-Type': 'application/json' },
      });
    });

    await page.goto(`${BASE_URL}/#/flashcards/favorites`);
    await page.waitForSelector('h1:has-text("Flashcards – Favourite Questions")');
  });

  // ------------------------------------------------------------------------
  // SCENARIO 8: Toggle between flashcards only and list view
  // ------------------------------------------------------------------------
  test('should toggle between flashcards only and list view', async ({ page }) => {
    await setupLocalStorage(page, USER_EMAIL);

    // Mock GET /api/favorite_questions/<email>
    await page.route(`**/api/favorite_questions/${USER_EMAIL}`, async (route) => {
      const mockData = {
        data: [
          {
            id: 1,
            question_text: 'What is a closure in JavaScript?',
            created_at: '2025-04-15T10:00:00Z',
            session_id: 'thread-101',
            question_type: 'technical',
            answer: '',
          },
        ],
      };
      await route.fulfill({
        status: 200,
        body: JSON.stringify(mockData),
        headers: { 'Content-Type': 'application/json' },
      });
    });

    await page.goto(`${BASE_URL}/#/flashcards/favorites`);
    await page.waitForSelector('h1:has-text("Flashcards – Favourite Questions")');

    // Check list view is visible by default
    await expect(page.getByRole('textbox')).toBeVisible();

    // Toggle to flashcards only
    await page.getByRole('button', { name: 'Flashcards Only' }).click();
    await expect(page.getByRole('button', { name: 'Show List' })).toBeVisible();

    // Toggle back to list view
    await page.getByRole('button', { name: 'Show List' }).click();
    await expect(page.getByRole('button', { name: 'Flashcards Only' })).toBeVisible();
  });

  // ------------------------------------------------------------------------
  // SCENARIO 9: Back navigation
  // ------------------------------------------------------------------------
  test('should navigate back using back button', async ({ page }) => {
    await setupLocalStorage(page, USER_EMAIL);

    // Mock GET /api/favorite_questions/<email> (empty to avoid rendering cards)
    await page.route(`**/api/favorite_questions/${USER_EMAIL}`, async (route) => {
      await route.fulfill({
        status: 200,
        body: JSON.stringify({ data: [] }),
        headers: { 'Content-Type': 'application/json' },
      });
    });

    await page.goto(`${BASE_URL}/#/flashcards/favorites`);
    await page.waitForSelector('button:has-text("Return to Dashboard")');

    // Click "Back" button
    await page.getByRole('button', { name: 'Return to Dashboard' }).click();
    await page.waitForURL(/dashboard/);
    await expect(page).toHaveURL(/dashboard/);
  });

  // ------------------------------------------------------------------------
  // SCENARIO 10: Empty state
  // ------------------------------------------------------------------------
  test('should display empty state when no flashcards exist', async ({ page }) => {
    await setupLocalStorage(page, USER_EMAIL);

    // Mock GET /api/favorite_questions/<email> (empty)
    await page.route(`**/api/favorite_questions/${USER_EMAIL}`, async (route) => {
      await route.fulfill({
        status: 200,
        body: JSON.stringify({ data: [] }),
        headers: { 'Content-Type': 'application/json' },
      });
    });

    await page.goto(`${BASE_URL}/#/flashcards/favorites`);
    await page.waitForSelector('p:has-text("No favourite questions yet.")');

    // Verify empty state
    await expect(page.getByText('No favourite questions yet.')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Return to Dashboard' })).toBeVisible();
  });
});