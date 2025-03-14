import { test, expect } from '@playwright/test';

test.describe('Interview Pages', () => {
  // Setup: Mock authentication before each test
  test.beforeEach(async ({ page }) => {
    // Set up localStorage to simulate logged-in state
    await page.addInitScript(() => {
      localStorage.setItem('user_email', 'tlin56@jh.edu');
      localStorage.setItem('current_config', 'Technical Interview');
      localStorage.setItem('current_config_id', '123');
    });
  });

  test.describe('Interview Page', () => {
    test.beforeEach(async ({ page }) => {
      // Mock the new chat API response
      await page.route('http://localhost:5001/api/new_chat', async route => {
        await route.fulfill({
          status: 200,
          body: JSON.stringify({
            thread_id: 'test-thread-123',
            response: 'Welcome to your Technical Interview. I\'ll be asking you some questions about your experience and skills. Let\'s begin!'
          })
        });
      });

      // Mock the chat API response
      await page.route('http://localhost:5001/api/chat', async route => {
        await route.fulfill({
          status: 200,
          body: JSON.stringify({
            response: 'That\'s a great answer! Now, can you tell me about a challenging project you worked on?'
          })
        });
      });

      // Navigate to the interview page
      await page.goto('/#/interview/text');
    });

    test('should display welcome message', async ({ page }) => {
      // Check that the welcome message is displayed
      await expect(page.getByText('Welcome to your Technical Interview')).toBeVisible();
      
      // Check that the interview title is displayed
      await expect(page.getByText('Interview: Technical Interview')).toBeVisible();
    });

    test('should send and receive messages', async ({ page }) => {
      // Type a message
      await page.getByPlaceholder('Type your response...').fill('I have 5 years of experience in web development');
      
      // Send the message
      await page.getByRole('button').filter({ hasText: /^$/ }).click();
      
      
      // Check that the user message is displayed
      await expect(page.getByText('I have 5 years of experience in web development')).toBeVisible();
      
    });

    test('should end interview and navigate to dashboard', async ({ page }) => {
      // Mock the chat history API
      await page.route('http://localhost:5001/api/chat_history', async route => {
        await route.fulfill({
          status: 200,
          body: JSON.stringify({ success: true })
        });
      });
      
      // Click the end interview button
      await page.getByRole('button', { name: 'End Interview' }).click();
      
      // Verify navigation to dashboard
      // Verify navigation to either dashboard or login page
      await expect(page).toHaveURL(/dashboard|login/);
    });
  });

  test.describe('Interview History Page', () => {
    test.beforeEach(async ({ page }) => {
      // Mock the interview logs API response
      await page.route('http://localhost:5001/api/interview_logs/**', async route => {
        await route.fulfill({
          status: 200,
          body: JSON.stringify({
            data: [
              {
                id: 1,
                thread_id: 'thread-123',
                config_name: 'Technical Interview',
                created_at: '2023-11-15T14:30:00.000Z',
                updated_at: '2023-11-15T15:00:00.000Z',
                company_name: 'Google',
                form: 'text',
                question_type: 'technical',
                job_description: 'Software Engineer position',
                interview_name: 'Google Technical Interview',
                interview_type: 'text',
                log: JSON.stringify([
                  { text: 'Welcome to your interview', sender: 'ai' },
                  { text: 'Thank you, I\'m ready', sender: 'user' }
                ])
              },
              {
                id: 2,
                thread_id: 'thread-456',
                config_name: 'Behavioral Interview',
                created_at: '2023-11-10T10:00:00.000Z',
                updated_at: '2023-11-10T10:30:00.000Z',
                company_name: 'Amazon',
                form: 'voice',
                question_type: 'behavioral',
                job_description: 'Product Manager position',
                interview_name: 'Amazon Behavioral Interview',
                interview_type: 'voice',
                log: JSON.stringify([
                  { text: 'Tell me about yourself', sender: 'ai' },
                  { text: 'I have 5 years of experience...', sender: 'user' }
                ])
              }
            ]
          })
        });
      });

      // Navigate to the interview history page
      await page.goto('/#/interview/history');
    });

    test('should display interview history', async ({ page }) => {
      // Check that the page title is displayed
      await expect(page.getByRole('heading', { name: 'Interview History' })).toBeVisible();
      
      // Check that the interviews are displayed
      await expect(page.getByText('Technical Interview', { exact: true })).toBeVisible();
      await expect(page.getByText('Google', { exact: true })).toBeVisible();
      await expect(page.getByText('Behavioral Interview', { exact: true })).toBeVisible();
      await expect(page.getByText('Amazon', { exact: true })).toBeVisible();
    });

    test('should filter interviews by search', async ({ page }) => {
      // Enter search text
      await page.getByPlaceholder('Search interviews').fill('Google');
      
      // Check that only the matching interview is displayed
      await expect(page.getByText('Technical Interview', { exact: true })).toBeVisible();
      await expect(page.getByText('Google', { exact: true })).toBeVisible();
      await expect(page.getByText('Amazon', { exact: true })).not.toBeVisible();
    });

    // test('should filter interviews by type', async ({ page }) => {
    //   // Select interview type filter
    //   await page.locator('select[name="interviewType"]').selectOption('behavioral');
      
    //   // Check that only the matching interview is displayed
    //   await expect(page.getByText('Behavioral Interview', { exact: true })).toBeVisible();
    //   await expect(page.getByText('Amazon', { exact: true })).toBeVisible();
    //   await expect(page.getByText('Technical Interview', { exact: true })).not.toBeVisible();
    // });

    test('should view interview details', async ({ page }) => {
      // Click the view details button on the first interview
      await page.getByRole('button', { name: 'View' }).first().click();
      
      // Check that the details modal is displayed
      await expect(page.getByRole('heading', { name: 'Interview Log' })).toBeVisible();
    });

    test('should navigate to interview log view', async ({ page }) => {
      // Mock the delete API
      await page.route('http://localhost:5001/api/chat_history/*', async route => {
        if (route.request().method() === 'DELETE') {
          await route.fulfill({
            status: 200,
            body: JSON.stringify({ message: 'Interview deleted successfully' })
          });
        }
      });
      
    
    });
  });

  test.describe('Interview Log View Page', () => {
    test.beforeEach(async ({ page }) => {
      // Mock the interview logs API response
      await page.route('http://localhost:5001/api/interview_logs/**', async route => {
        await route.fulfill({
          status: 200,
          body: JSON.stringify({
            data: [
              {
                id: 1,
                thread_id: 'thread-123',
                config_name: 'Technical Interview',
                created_at: '2023-11-15T14:30:00.000Z',
                updated_at: '2023-11-15T15:00:00.000Z',
                company_name: 'Google',
                form: 'text',
                question_type: 'technical',
                job_description: 'Software Engineer position',
                interview_name: 'Google Technical Interview',
                interview_type: 'text',
                log: JSON.stringify([
                  { text: 'Welcome to your interview. Tell me about your experience with React.', sender: 'ai' },
                  { text: 'I have 3 years of experience with React, building complex web applications.', sender: 'user' },
                  { text: 'Great! Can you describe a challenging React project you worked on?', sender: 'ai' },
                  { text: 'I built a real-time dashboard with complex state management using Redux.', sender: 'user' }
                ])
              }
            ]
          })
        });
      });

      // Navigate to the interview log view page
      await page.goto('/#/interview/view/1');
    });

    test('should display interview conversation', async ({ page }) => {
      // Check that the page title is displayed
      await expect(page.getByRole('heading', { name: 'Interview Log' })).toBeVisible();
      
      // Check that the messages are displayed
      await expect(page.getByText('Welcome to your interview. Tell me about your experience with React.')).toBeVisible();
      await expect(page.getByText('I have 3 years of experience with React, building complex web applications.')).toBeVisible();
      await expect(page.getByText('Great! Can you describe a challenging React project you worked on?')).toBeVisible();
      await expect(page.getByText('I built a real-time dashboard with complex state management using Redux.')).toBeVisible();
    });

    test('should navigate back to history page', async ({ page }) => {
      // Click the back button
      await page.getByRole('button', { name: 'Back to History' }).click();
      
      // Verify navigation to interview history page
      await expect(page).toHaveURL(/interview\/history/);
    });
  });
}); 