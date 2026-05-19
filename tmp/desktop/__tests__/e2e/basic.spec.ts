import { _electron as electron } from '@playwright/test';
import { test, expect } from '@playwright/test';
import path from 'path';

// E2E Test Suite: Validates the actual compiled Electron binary and UI interactions
test('launch app', async () => {
  // Strategy: Launch Electron using the compiled main entry point
  const electronApp = await electron.launch({
    args: [
      path.resolve('dist-electron/main.js'),
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-gpu',
    ],
  });

  // Verify internal Electron state (packaging/development mode)
  const isPackaged = await electronApp.evaluate(async ({ app }) => {
    return app.isPackaged;
  });

  console.log(`Is Packaged: ${isPackaged}`);

  // Flow: Select the main application window and wait for the React hydration
  const window = await electronApp.firstWindow();

  // Wait for the window to load completely before querying elements
  await window.waitForLoadState('domcontentloaded');

  // Assertions: Ensure the default 'Receive' landing page is visible on startup
  const receiveTab = window.locator('button:has-text("Receive")');
  await expect(receiveTab).toBeVisible();

  // Cleanup: Gracefully terminate the app session
  await electronApp.close();
});
