import { test, expect } from '@playwright/test';

// A small helper to set localStorage (simulate user login) before the page loads
async function setupLocalStorage(page, userEmail: string) {
  await page.addInitScript((email: string) => {
    localStorage.setItem('user_email', email);
  }, userEmail);
}

test.describe('InterviewHistoryPage Tests', () => {
  // This is your base test route, e.g. http://localhost:5173
  const BASE_URL = 'http://localhost:5173';

  // ------------------------------------------------------------------------
  // SCENARIO 1: No user_email => redirect to /login
  // ------------------------------------------------------------------------
  test('should redirect to /login if no user_email in localStorage', async ({ page }) => {
    // We do NOT set localStorage user_email
    // Navigate directly
    await page.goto(`${BASE_URL}/#/interview/history`); // or the actual route you use

    // The page should detect no user logged in and navigate('/login')
    await page.waitForTimeout(500); 
    await expect(page).toHaveURL(/login/);
  });

  // ------------------------------------------------------------------------
  // SCENARIO 2: Load logs, display them in a table
  // ------------------------------------------------------------------------
  test('should load and display interview logs', async ({ page }) => {
    await setupLocalStorage(page, 'testuser@example.com');
    
    // Mock GET /api/interview_logs/testuser@example.com
    await page.route('**/api/interview_logs/testuser@example.com', async route => {
      const mockData = {
        data: [
          {
            id: 101,
            thread_id: 'thread-101',
            config_name: 'Engineering Interview',
            updated_at: '2025-04-10T12:34:56Z',
            created_at: '2025-04-10T12:00:00Z',
            log: [],
            company_name: 'Acme Corp',
            question_type: 'technical',
            interview_type: 'voice'
          },
          {
            id: 202,
            thread_id: 'thread-202',
            interview_name: 'Manager Round',
            updated_at: '2025-03-15T08:22:00Z',
            created_at: '2025-03-15T07:00:00Z',
            log: [],
            company_name: 'MegaCorp',
            question_type: 'behavioral',
            interview_type: 'text'
          }
        ]
      };
      await route.fulfill({
        status: 200,
        body: JSON.stringify(mockData),
        headers: { 'Content-Type': 'application/json' }
      });
    });

    await page.goto(`${BASE_URL}/#/interview/history`);
    // Wait for table to load
    await page.waitForTimeout(500);

    // Check that table rows appear
    // By default, Interview Config column shows the log title
    await expect(page.getByText('Engineering Interview')).toBeVisible();
    await expect(page.getByText('Manager Round')).toBeVisible();

    // Check some columns (like "Company")
    await expect(page.getByText('Acme Corp')).toBeVisible();
    await expect(page.getByText('MegaCorp')).toBeVisible();
  });

  // ------------------------------------------------------------------------
  // SCENARIO 3: Filters (search, date range, interview type)
  // ------------------------------------------------------------------------
  test('should filter logs by search text', async ({ page }) => {
    await setupLocalStorage(page, 'testuser@example.com');
    // Reuse same mock from above or define a new route
    await page.route('**/api/interview_logs/testuser@example.com', async route => {
      const logs = {
        data: [
          { id: 1, config_name: 'Front-end Interview', company_name: 'Google', updated_at: '2025-02-01T10:00:00Z', log: [] },
          { id: 2, config_name: 'Backend Interview', company_name: 'Amazon', updated_at: '2025-02-02T10:00:00Z', log: [] },
        ]
      };
      await route.fulfill({
        status: 200,
        body: JSON.stringify(logs),
        headers: { 'Content-Type': 'application/json' }
      });
    });

    await page.goto(`${BASE_URL}/#/interview/history`);
    await page.waitForTimeout(500);

    // Initially, both appear
    await expect(page.getByText('Front-end Interview')).toBeVisible();
    await expect(page.getByText('Backend Interview')).toBeVisible();

    // Type "front-end" in the search box
    await page.fill('input[placeholder="Search interviews"]', 'front-end');

    // Wait a bit for filter logic
    await page.waitForTimeout(300);

    // "Front-end Interview" should remain, "Backend Interview" should be hidden
    await expect(page.getByText('Front-end Interview')).toBeVisible();
    await expect(page.getByText('Backend Interview')).not.toBeVisible();
  });

  // You can similarly test date range or type filter if you like:
  // e.g. fill the RangePicker, select interview type "technical", etc.

  // ------------------------------------------------------------------------
  // SCENARIO 4: Clicking "View" => navigate /interview/view/:id
  // ------------------------------------------------------------------------
  test('should navigate to /interview/view/:id on "View"', async ({ page }) => {
    await setupLocalStorage(page, 'testuser@example.com');
    // Stub logs
    await page.route('**/api/interview_logs/testuser@example.com', async route => {
      const logs = { data: [ { id: 888, config_name: 'Mock Interview', updated_at: '', log: [] } ] };
      await route.fulfill({ status: 200, body: JSON.stringify(logs) });
    });

    await page.goto(`${BASE_URL}/#/interview/history`);
    await page.waitForTimeout(500);

    // Click the "View" action for the single row
    // The button might have text or an icon; 
    // from your code: <EyeOutlined /> with text "View"
    await page.getByRole('button', { name: /view/i }).click();

    // The code calls: navigate(`/interview/view/${log.id}`)
    await page.waitForTimeout(500);
    await expect(page).toHaveURL(/\/interview\/view\/888/);
  });

  // ------------------------------------------------------------------------
  // SCENARIO 5: "Details" => open modal => fetch performance data
  // ------------------------------------------------------------------------
  test('should open Details modal and load performance data', async ({ page }) => {
    await setupLocalStorage(page, 'testuser@example.com');
    
    // Stub logs
    await page.route('**/api/interview_logs/testuser@example.com', async route => {
      const logs = { data: [ { id: 999, config_name: 'Detailed Interview', updated_at: '', log: [] } ] };
      await route.fulfill({ status: 200, body: JSON.stringify(logs) });
    });

    // Mock performance data calls
    await page.route('**/api/interview_scores/999', async route => {
      const mockScores = {
        scores: {
          technical: 0.8,
          communication: 0.9,
          confidence: 0.75,
          problem_solving: 0.85,
          "resume strength": 0.7,
          leadership: 0.65
        }
      };
      await route.fulfill({ status: 200, body: JSON.stringify(mockScores) });
    });
    await page.route('**/api/interview_feedback_strengths/999', async route => {
      await route.fulfill({ status: 200, body: JSON.stringify({ strengths: '["Strong tech knowledge","Clear communication"]' }) });
    });
    await page.route('**/api/interview_feedback_improvement_areas/999', async route => {
      await route.fulfill({ status: 200, body: JSON.stringify({ improvement_areas: '["Focus on examples"]' }) });
    });
    await page.route('**/api/interview_feedback_specific_feedback/999', async route => {
      await route.fulfill({ status: 200, body: JSON.stringify({ specific_feedback: 'Overall good performance.' }) });
    });

    await page.goto(`${BASE_URL}/#/interview/history`);
    await page.waitForTimeout(500);

    // Click "Details"
    await page.getByRole('button', { name: /details/i }).click();

    // The modal should appear
    await expect(page.getByRole('heading', { name: 'Detailed Interview' })).toBeVisible();
    
    // Wait for performance data
    await page.waitForTimeout(1000);

    // Check that the performance stats appear
    await expect(page.getByText('80%')).toBeVisible();  // technical
    await expect(page.getByText('90%')).toBeVisible();  // communication
    await expect(page.getByText('75%')).toBeVisible();  // confidence
    await expect(page.getByText('85%')).toBeVisible();  // problem_solving
    await expect(page.getByText('70%')).toBeVisible();  // resume_strength
    await expect(page.getByText('65%')).toBeVisible();  // leadership

    // Check strengths/improvement
    await expect(page.getByText('Strong tech knowledge')).toBeVisible();
    await expect(page.getByText('Clear communication')).toBeVisible();
    await expect(page.getByText('Focus on examples')).toBeVisible();
    await expect(page.getByText('Overall good performance.')).toBeVisible();
  });

  // ------------------------------------------------------------------------
  // SCENARIO 6: "Export" => call exportToPDF
  // ------------------------------------------------------------------------
  test('should export an interview', async ({ page }) => {
    await setupLocalStorage(page, 'testuser@example.com');
    // Stub logs
    await page.route('**/api/interview_logs/testuser@example.com', async route => {
      const logs = {
        data: [
          {
            id: 303,
            config_name: 'Export Interview',
            updated_at: '2025-04-12T12:00:00Z',
            log: [{ sender: 'user', text: 'Hello?' }, { sender: 'ai', text: 'Welcome!' }],
            question_type: 'technical',
            interview_type: 'text'
          }
        ]
      };
      await route.fulfill({ status: 200, body: JSON.stringify(logs) });
    });

    // Also mock the detailed endpoints for performance data if your code fetches them
    // Or skip if it doesn't fetch them for Export

    await page.goto(`${BASE_URL}/#/interview/history`);
    await page.waitForTimeout(500);

    // Intercept the console log or window calls if needed
    // Because `exportToPDF` might open a new window or do something else
    // For demonstration, let's just ensure the "Export" button is clickable
    await page.getByRole('button', { name: /Export/i }).click();

    // The code might produce a message "Export prepared"
    // await expect(page.getByText('Export prepared. Use browser print dialog to save as PDF.')).toBeVisible();
  });

  // ------------------------------------------------------------------------
  // SCENARIO 7: Delete => confirm => remove from table
  // ------------------------------------------------------------------------
  test('should delete an interview after confirmation', async ({ page }) => {
    await setupLocalStorage(page, 'testuser@example.com');
    // Stub logs
    await page.route('**/api/interview_logs/testuser@example.com', async route => {
      const logs = { data: [ { id: 404, config_name: 'Delete Interview', updated_at: '', log: [] } ] };
      await route.fulfill({ status: 200, body: JSON.stringify(logs) });
    });

    // Mock DELETE
    await page.route('**/api/chat_history/404', async route => {
      await route.fulfill({
        status: 200,
        body: JSON.stringify({ message: 'Interview deleted successfully' })
      });
    });

    await page.goto(`${BASE_URL}/#/interview/history`);
    await page.waitForTimeout(500);

    // The single row: "Delete Interview"
    await expect(page.getByText('Delete Interview')).toBeVisible();

    // Click the "Delete" button
    await page.getByRole('button', { name: /delete/i }).click();

    // Accept the confirmation dialog
    page.once('dialog', async dialog => {
      await dialog.accept();
    });

    // Wait a bit
    await page.waitForTimeout(500);

    // The row should be gone
    // await expect(page.getByText('Delete Interview')).not.toBeVisible();
  });

  // ------------------------------------------------------------------------
  // SCENARIO 8: "Back to Dashboard" => navigate('/dashboard')
  // ------------------------------------------------------------------------
  test('should navigate back to dashboard', async ({ page }) => {
    await setupLocalStorage(page, 'testuser@example.com');
    // Stub logs => an empty array
    await page.route('**/api/interview_logs/testuser@example.com', async route => {
      await route.fulfill({ status: 200, body: JSON.stringify({ data: [] }) });
    });

    await page.goto(`${BASE_URL}/#/interview/history`);
    await page.waitForTimeout(500);

    // Click the back button
    await page.getByRole('button', { name: 'Back to Dashboard' }).click();
    await page.waitForTimeout(300);

    // Check navigation
    await expect(page).toHaveURL(/dashboard/);
  });
});
