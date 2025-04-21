import { test, expect } from '@playwright/test';

// Helper to set localStorage (simulate user login) before the page loads
async function setupLocalStorage(page, userEmail: string) {
  await page.addInitScript((email: string) => {
    localStorage.setItem('user_email', email);
  }, userEmail);
}

test.describe('FavoriteQuestionsPage Tests', () => {
  const BASE_URL = 'http://localhost:5173';

  // ------------------------------------------------------------------------
  // SCENARIO 1: No user_email => redirect to /login
  // ------------------------------------------------------------------------
  test('should redirect to /login if no user_email in localStorage', async ({ page }) => {
    await page.goto(`${BASE_URL}/#/favorites`);
    await page.waitForTimeout(500);
    await expect(page).toHaveURL(/login/);
  });

  // ------------------------------------------------------------------------
  // SCENARIO 2: Load favorite questions in table
  // ------------------------------------------------------------------------
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
            session_id: 'thread-101',
            email: 'testuser@example.com',
            question_type: 'technical',
            log: '[]'
          },
          {
            id: 2,
            question_text: 'What are your biggest strengths?',
            created_at: '2025-04-14T12:00:00Z',
            session_id: 'thread-102',
            email: 'testuser@example.com',
            question_type: 'behavioral',
            log: '[]'
          }
        ]
      };
      await route.fulfill({
        status: 200,
        body: JSON.stringify(mockData),
        headers: { 'Content-Type': 'application/json' }
      });
    });

    // Mock GET /api/interview_logs/<email>
    await page.route('**/api/interview_logs/testuser@example.com', async route => {
      const mockLogs = {
        data: [
          {
            thread_id: 'thread-101',
            interview_type: 'text',
            question_type: 'technical',
            config_name: 'Technical Interview'
          },
          {
            thread_id: 'thread-102',
            interview_type: 'voice',
            question_type: 'behavioral',
            config_name: 'Behavioral Interview'
          }
        ]
      };
      await route.fulfill({
        status: 200,
        body: JSON.stringify(mockLogs),
        headers: { 'Content-Type': 'application/json' }
      });
    });

    await page.goto(`${BASE_URL}/#/favorites`);
    await page.waitForTimeout(500);

    // Check table rows
    await expect(page.getByText('What is a closure in JavaScript?')).toBeVisible();
    await expect(page.getByText('What are your biggest strengths?')).toBeVisible();

    // Check types and interview types
    await expect(page.getByText('Technical')).toBeVisible();
    await expect(page.getByText('Behavioral')).toBeVisible();
    await expect(page.getByText('Text')).toBeVisible();
    await expect(page.getByText('Voice')).toBeVisible();

    // Check dates
    await expect(page.getByText('4/15/2025')).toBeVisible();
    await expect(page.getByText('4/14/2025')).toBeVisible();
  });

  // ------------------------------------------------------------------------
  // SCENARIO 3: Filter by search text
  // ------------------------------------------------------------------------
  test('should filter favorite questions by search text', async ({ page }) => {
    await setupLocalStorage(page, 'testuser@example.com');

    // Mock GET /api/favorite_questions/<email>
    await page.route('**/api/favorite_questions/testuser@example.com', async route => {
      const mockData = {
        data: [
          {
            id: 1,
            question_text: 'What is a closure in JavaScript?',
            created_at: '2025-04-15T10:00:00Z',
            session_id: 'thread-101',
            email: 'testuser@example.com',
            question_type: 'technical',
            log: '[]'
          },
          {
            id: 2,
            question_text: 'What are your biggest strengths?',
            created_at: '2025-04-14T12:00:00Z',
            session_id: 'thread-102',
            email: 'testuser@example.com',
            question_type: 'behavioral',
            log: '[]'
          }
        ]
      };
      await route.fulfill({
        status: 200,
        body: JSON.stringify(mockData),
        headers: { 'Content-Type': 'application/json' }
      });
    });

    // Mock GET /api/interview_logs/<email>
    await page.route('**/api/interview_logs/testuser@example.com', async route => {
      const mockLogs = {
        data: [
          { thread_id: 'thread-101', interview_type: 'text', question_type: 'technical' },
          { thread_id: 'thread-102', interview_type: 'voice', question_type: 'behavioral' }
        ]
      };
      await route.fulfill({
        status: 200,
        body: JSON.stringify(mockLogs),
        headers: { 'Content-Type': 'application/json' }
      });
    });

    await page.goto(`${BASE_URL}/#/favorites`);
    await page.waitForTimeout(500);

    // Initially, both questions are visible
    await expect(page.getByText('What is a closure in JavaScript?')).toBeVisible();
    await expect(page.getByText('What are your biggest strengths?')).toBeVisible();

    // Type "closure" in the search input
    await page.fill('input[placeholder="Search questions..."]', 'closure');
    await page.waitForTimeout(300);

    // Only the closure question should remain
    await expect(page.getByText('What is a closure in JavaScript?')).toBeVisible();
    await expect(page.getByText('What are your biggest strengths?')).not.toBeVisible();
  });

  // ------------------------------------------------------------------------
  // SCENARIO 4: View session (text interview)
  // ------------------------------------------------------------------------
  test('should navigate to /interview/view/:session_id for text interview', async ({ page }) => {
    await setupLocalStorage(page, 'testuser@example.com');

    // Mock GET /api/favorite_questions/<email>
    await page.route('**/api/favorite_questions/testuser@example.com', async route => {
      const mockData = {
        data: [
          {
            id: 1,
            question_text: 'What is a closure in JavaScript?',
            created_at: '2025-04-15T10:00:00Z',
            session_id: 'thread-101',
            email: 'testuser@example.com',
            question_type: 'technical',
            log: '[]'
          }
        ]
      };
      await route.fulfill({
        status: 200,
        body: JSON.stringify(mockData),
        headers: { 'Content-Type': 'application/json' }
      });
    });

    // Mock GET /api/interview_logs/<email>
    await page.route('**/api/interview_logs/testuser@example.com', async route => {
      const mockLogs = {
        data: [
          {
            thread_id: 'thread-101',
            interview_type: 'text',
            question_type: 'technical',
            log: [{ sender: 'ai', text: 'What is a closure?' }]
          }
        ]
      };
      await route.fulfill({
        status: 200,
        body: JSON.stringify(mockLogs),
        headers: { 'Content-Type': 'application/json' }
      });
    });

    await page.goto(`${BASE_URL}/#/favorites`);
    await page.waitForTimeout(500);

    // Click "View Session" button
    await page.getByRole('button', { name: /View Session/i }).click();
    await page.waitForTimeout(600); // Match component's transition timeout

    // Verify navigation
    await expect(page).toHaveURL(/\/interview\/view\/thread-101/);
  });

  // ------------------------------------------------------------------------
  // SCENARIO 5: View session (voice interview)
  // ------------------------------------------------------------------------
  test('should navigate to /voice/interview/view/:session_id for voice interview', async ({ page }) => {
    await setupLocalStorage(page, 'testuser@example.com');

    // Mock GET /api/favorite_questions/<email>
    await page.route('**/api/favorite_questions/testuser@example.com', async route => {
      const mockData = {
        data: [
          {
            id: 1,
            question_text: 'What is a closure in JavaScript?',
            created_at: '2025-04-15T10:00:00Z',
            session_id: '12345',
            email: 'testuser@example.com',
            question_type: 'technical',
            log: '[]'
          }
        ]
      };
      await route.fulfill({
        status: 200,
        body: JSON.stringify(mockData),
        headers: { 'Content-Type': 'application/json' }
      });
    });

    // Mock GET /api/interview_logs/<email> (empty, as it's a voice session)
    await page.route('**/api/interview_logs/testuser@example.com', async route => {
      await route.fulfill({
        status: 200,
        body: JSON.stringify({ data: [] }),
        headers: { 'Content-Type': 'application/json' }
      });
    });

    // Mock GET /api/chat_history/<session_id>
    await page.route('**/api/chat_history/12345', async route => {
      const mockChat = {
        messages: [{ sender: 'ai', text: 'What is a closure?' }]
      };
      await route.fulfill({
        status: 200,
        body: JSON.stringify(mockChat),
        headers: { 'Content-Type': 'application/json' }
      });
    });

    await page.goto(`${BASE_URL}/#/favorites`);
    await page.waitForTimeout(500);

    // Click "View Session" button
    await page.getByRole('button', { name: /View Session/i }).click();
    await page.waitForTimeout(600); // Match component's transition timeout

    // Verify navigation
    await expect(page).toHaveURL(/\/voice\/interview\/view\/12345/);
  });

  // ------------------------------------------------------------------------
  // SCENARIO 6: Practice all flashcards
  // ------------------------------------------------------------------------
  test('should navigate to /flashcards/favorites for all flashcards', async ({ page }) => {
    await setupLocalStorage(page, 'testuser@example.com');

    // Mock GET /api/favorite_questions/<email>
    await page.route('**/api/favorite_questions/testuser@example.com', async route => {
      const mockData = {
        data: [
          {
            id: 1,
            question_text: 'What is a closure in JavaScript?',
            created_at: '2025-04-15T10:00:00Z',
            session_id: 'thread-101',
            email: 'testuser@example.com',
            question_type: 'technical',
            log: '[]'
          }
        ]
      };
      await route.fulfill({
        status: 200,
        body: JSON.stringify(mockData),
        headers: { 'Content-Type': 'application/json' }
      });
    });

    // Mock GET /api/interview_logs/<email>
    await page.route('**/api/interview_logs/testuser@example.com', async route => {
      await route.fulfill({
        status: 200,
        body: JSON.stringify({ data: [] }),
        headers: { 'Content-Type': 'application/json' }
      });
    });

    await page.goto(`${BASE_URL}/#/favorites`);
    await page.waitForTimeout(500);

    // Click "Practice All Flashcards" button
    await page.getByRole('button', { name: /Practice With Flashcards/i }).click();
    await page.waitForTimeout(300);

    // Verify navigation
    await expect(page).toHaveURL(/\/flashcards\/favorites/);
  });

  // ------------------------------------------------------------------------
  // SCENARIO 7: Back to interview history
  // ------------------------------------------------------------------------
  test('should navigate back to interview history', async ({ page }) => {
    await setupLocalStorage(page, 'testuser@example.com');

    // Mock GET /api/favorite_questions/<email> (empty to avoid table rendering)
    await page.route('**/api/favorite_questions/testuser@example.com', async route => {
      await route.fulfill({
        status: 200,
        body: JSON.stringify({ data: [] }),
        headers: { 'Content-Type': 'application/json' }
      });
    });

    // Mock GET /api/interview_logs/<email>
    await page.route('**/api/interview_logs/testuser@example.com', async route => {
      await route.fulfill({
        status: 200,
        body: JSON.stringify({ data: [] }),
        headers: { 'Content-Type': 'application/json' }
      });
    });

    await page.goto(`${BASE_URL}/#/favorites`);
    await page.waitForTimeout(500);

    // Click "Back to Interview History" button
    await page.getByRole('button', { name: /Back to Interview History/i }).click();
    await page.waitForTimeout(300);

    // Verify navigation
    await expect(page).toHaveURL(/\/interview\/history/);
  });

  // ------------------------------------------------------------------------
  // SCENARIO 8: Empty state
  // ------------------------------------------------------------------------
  test('should display empty state when no favorite questions exist', async ({ page }) => {
    await setupLocalStorage(page, 'testuser@example.com');

    // Mock GET /api/favorite_questions/<email> (empty)
    await page.route('**/api/favorite_questions/testuser@example.com', async route => {
      await route.fulfill({
        status: 200,
        body: JSON.stringify({ data: [] }),
        headers: { 'Content-Type': 'application/json' }
      });
    });

    // Mock GET /api/interview_logs/<email>
    await page.route('**/api/interview_logs/testuser@example.com', async route => {
      await route.fulfill({
        status: 200,
        body: JSON.stringify({ data: [] }),
        headers: { 'Content-Type': 'application/json' }
      });
    });

    await page.goto(`${BASE_URL}/#/favorites`);
    await page.waitForTimeout(500);

    // Verify empty state
    await expect(page.getByText('No favorite questions yet')).toBeVisible();
  });
});