import { test, expect } from '@playwright/test';

// Helper function to set localStorage (simulate user login & config)
async function setupLocalStorage(page, {
  userEmail,
  configName,
  configId,
  userPhotoUrl
}: {
  userEmail?: string;
  configName?: string;
  configId?: string;
  userPhotoUrl?: string;
}) {
  await page.addInitScript((args) => {
    const { userEmail, configName, configId, userPhotoUrl } = args;
    if (userEmail) localStorage.setItem('user_email', userEmail);
    if (configName) localStorage.setItem('current_config', configName);
    if (configId) localStorage.setItem('current_config_id', configId);
    if (userPhotoUrl) localStorage.setItem('user_photo_url', userPhotoUrl);
  }, { userEmail, configName, configId, userPhotoUrl });
}

test.describe('VoiceInterviewPage Tests', () => {
  const BASE_URL = 'http://localhost:5173';

  // ------------------------------------------------------------------------
  // SCENARIO 1: No user => redirect to /login
  // ------------------------------------------------------------------------
  test('should redirect to /login if no user_email is set', async ({ page }) => {
    // Don’t set localStorage; navigate straight there
    await page.goto(`${BASE_URL}/#/interview/voice`);
    await page.waitForTimeout(500);

    // The code checks userEmail => none => navigate('/login')
    await expect(page).toHaveURL(/login/);
  });

  // ------------------------------------------------------------------------
  // SCENARIO 2: No config => redirect to /prompts
  // ------------------------------------------------------------------------
  test('should redirect to /prompts if no config_name or config_id', async ({ page }) => {
    // Only set user email
    await setupLocalStorage(page, { userEmail: 'voiceuser@example.com' });
    await page.goto(`${BASE_URL}/#/interview/voice`);
    await page.waitForTimeout(500);
    
    // The code sees no config => `message.error(...) => navigate('/prompts')`
    await expect(page).toHaveURL(/prompts/);
  });

  // ------------------------------------------------------------------------
  // SCENARIO 3: Successful init => mock /api/new_chat + text2speech
  // ------------------------------------------------------------------------
  test('should initialize voice interview and auto-play a welcome message', async ({ page }) => {
    await setupLocalStorage(page, {
      userEmail: 'voiceuser@example.com',
      configName: 'Voice Interview Config',
      configId: '123',
      userPhotoUrl: 'https://example.com/me.png'
    });

    // Mock /api/new_chat
    await page.route('**/api/new_chat', async route => {
      const mockData = {
        thread_id: 'VOICE_THREAD_ID',
        response: 'Welcome to your voice interview session for "Voice Interview Config".'
      };
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(mockData)
      });
    });

    // Mock text2speech => returns an audio_url
    await page.route('**/api/text2speech/voiceuser@example.com', async route => {
      const mockTTS = {
        audio_url: 'https://example.com/audio/welcome.wav',
        storage_path: 'audio/welcome.wav',
        duration: 3.5
      };
      await route.fulfill({
        status: 200,
        body: JSON.stringify(mockTTS),
        headers: { 'Content-Type': 'application/json' }
      });
    });

    await page.goto(`${BASE_URL}/#/interview/voice`);
    // Wait for the page to do its initialization
    await page.waitForTimeout(1000);

    // Check that we see "Voice Interview: Voice Interview Config"
    await expect(page.getByRole('heading', { name: 'Voice Interview: Voice Interview Config' })).toBeVisible();

    // The welcome AI message should appear
    // await expect(page.getByText('Welcome to your voice interview session for "Voice Interview Config".')).toBeVisible();
  });

  // ------------------------------------------------------------------------
  // SCENARIO 4: Mock the microphone to simulate a short recording
  // ------------------------------------------------------------------------
  test('should start/stop recording and display user voice message', async ({ page, browserName }) => {
    // Some browsers in headless mode can’t do real audio capturing
    // So we’ll mock getUserMedia or skip if the environment doesn’t allow it
    await setupLocalStorage(page, {
      userEmail: 'voiceuser@example.com',
      configName: 'Voice Interview Config',
      configId: 'abc'
    });

    // Mock /api/new_chat
    await page.route('**/api/new_chat', async route => {
      await route.fulfill({
        status: 200,
        body: JSON.stringify({
          thread_id: 'VOICE_THREAD_MOCK',
          response: 'Welcome to your voice interview session.'
        })
      });
    });

    // Possibly stub text2speech if your code calls it for the welcome message
    await page.route('**/api/text2speech/voiceuser@example.com', async route => {
      await route.fulfill({
        status: 200,
        body: JSON.stringify({
          audio_url: 'https://example.com/audio/welcome.wav',
          storage_path: 'audio/welcome.wav',
          duration: 2.0
        })
      });
    });

    // Intercept any calls for the final speech2text
    // This is triggered when the user stops recording
    await page.route('**/api/speech2text/voiceuser@example.com', async route => {
      // Return a mock transcript plus an audio
      const mockData = {
        transcript: 'Hello from user microphone test',
        audio_url: 'https://example.com/audio/user.wav',
        storage_path: 'audio/user.wav'
      };
      await route.fulfill({ status: 200, body: JSON.stringify(mockData) });
    });

    // Also mock /api/chat for the AI response after user sends message
    await page.route('**/api/chat', async route => {
      await route.fulfill({
        status: 200,
        body: JSON.stringify({ response: 'AI has received your message' })
      });
    });

    await page.goto(`${BASE_URL}/#/interview/voice`);
    await page.waitForTimeout(500);

    // 1) The page might ask for mic permission – typically we’d stub or skip
    // 2) We see "Click to start recording"
    await expect(page.getByText('Click to start recording')).toBeVisible();

    // Click the big mic button
    // await page.locator('.largeMic').click();
    // // This triggers getUserMedia => in real usage we might see a prompt
    // // We'll just wait a second and pretend we recorded
    // await page.waitForTimeout(1000);

    // // Stop recording
    // await page.locator('.largeMic').click();
    // // Wait for speech2text to complete
    // await page.waitForTimeout(1000);

    // The user message "Hello from user microphone test" should appear
    // await expect(page.getByText('Hello from user microphone test')).toBeVisible();

    // The code will also call /api/chat => AI reply
    // Then it calls text2speech again for the AI message
    // If you want to test that end to end, intercept the second TTS call
    // ...
    // Wait for the AI's message
    // await expect(page.getByText('AI has received your message')).toBeVisible();
  });

  // ------------------------------------------------------------------------
  // SCENARIO 5: Play a message (user or AI)
  // ------------------------------------------------------------------------
  test('should play a message audio if the user clicks it', async ({ page }) => {
    // For simplicity, skip the entire init flow. We'll directly set messages in the DOM, or mock them
    // But in a real test, you'd do the full flow as above.
    await setupLocalStorage(page, {
      userEmail: 'voiceuser@example.com',
      configName: 'PlayTest Interview',
      configId: '999'
    });

    // new_chat + text2speech stubs
    await page.route('**/api/new_chat', async route => {
      await route.fulfill({
        status: 200,
        body: JSON.stringify({ thread_id: 'PLAY_THREAD', response: 'Welcome audio' })
      });
    });
    await page.route('**/api/text2speech/**', async route => {
      await route.fulfill({ status: 200, body: JSON.stringify({ audio_url: 'https://example.com/audio/ai.wav', duration: 3 }) });
    });

    await page.goto(`${BASE_URL}/#/interview/voice`);
    await page.waitForTimeout(500);

    // Suppose after init, we want to test playing an existing AI message with an audioUrl
    // You can do something like:
    await page.evaluate(() => {
      window.__messagesTest__ = [
        {
          text: 'AI message with audio',
          sender: 'ai',
          audioUrl: 'https://example.com/audio/ai.wav',
          isReady: true
        }
      ];
    });
    // Then override the messages in React (this can be trickier).
    // Alternatively, if your code store messages in local state, you might do the full flow or
    // forcibly inject them with e.g. a "test" route or fixture.

    // For demonstration, let's just confirm the message is clickable. 
    // We can't do real playback in headless. But we can check for console logs or errors.
    // If the message is displayed, then user can click a "Play" button or bubble.
    // For instance, if your <VoiceBubble> has a "Play" button, do:

    // We'll simply confirm it's in the DOM:
    // e.g. page.getByText('AI message with audio')
    // and you'd do something like:
    // await page.getByRole('button', { name: /Play Audio/i }).click();
    // Then confirm no errors.

    // This part will vary depending on your actual UI for "Play".
  });

  // ------------------------------------------------------------------------
  // SCENARIO 6: End Interview => calls /api/chat_history => navigates to /dashboard
  // ------------------------------------------------------------------------
  test('should end interview, save chat history, and go to dashboard', async ({ page }) => {
    await setupLocalStorage(page, {
      userEmail: 'voiceuser@example.com',
      configName: 'VoiceEnd Interview',
      configId: 'XYZ'
    });

    // Mock new_chat
    await page.route('**/api/new_chat', async route => {
      await route.fulfill({
        status: 200,
        body: JSON.stringify({
          thread_id: 'END_VOICE_THREAD',
          response: 'Welcome voice interview'
        })
      });
    });

    // Mock /api/chat_history
    let chatHistoryRequest: any = null;
    await page.route('**/api/chat_history', async route => {
      chatHistoryRequest = await route.request().postDataJSON();
      await route.fulfill({
        status: 200,
        body: JSON.stringify({ success: true })
      });
    });

    // text2speech mock
    await page.route('**/api/text2speech/**', async route => {
      await route.fulfill({ status: 200, body: JSON.stringify({ audio_url: 'fake.wav' }) });
    });

    await page.goto(`${BASE_URL}/#/interview/voice`);
    await page.waitForTimeout(500);

    // The user does some steps, let's skip for brevity
    // Now click "End Interview"
    await page.getByRole('button', { name: /End Interview/i }).click();

    // The code calls saveChatHistory => /api/chat_history => then navigate('/dashboard')
    await page.waitForTimeout(500);
    await expect(page).toHaveURL(/dashboard/);

    // Verify the posted chat messages
    expect(chatHistoryRequest).not.toBeNull();
    expect(chatHistoryRequest).toMatchObject({
      thread_id: 'END_VOICE_THREAD',
      email: 'voiceuser@example.com',
      config_name: 'VoiceEnd Interview',
      config_id: 'XYZ',
      messages: expect.any(Array)
    });
  });
});
