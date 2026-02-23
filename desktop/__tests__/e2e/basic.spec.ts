import { _electron as electron } from '@playwright/test';
import { test, expect } from '@playwright/test';
import path from 'path';

test('launch app', async () => {
  const electronApp = await electron.launch({
    args: [path.resolve('dist-electron/main.js')],
  });

  const isPackaged = await electronApp.evaluate(async ({ app }) => {
    return app.isPackaged;
  });

  console.log(`Is Packaged: ${isPackaged}`);

  const window = await electronApp.firstWindow();
  
  // Wait for the window to load
  await window.waitForLoadState('domcontentloaded');

  // Check title or some text
  // Given it's a file transfer app, might have 'Receive' or 'Send' tabs
  const receiveTab = window.locator('button:has-text("Receive")');
  await expect(receiveTab).toBeVisible();

  await electronApp.close();
});
