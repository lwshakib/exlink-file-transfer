import { render, screen, waitFor, act } from '@testing-library/react';
import { SettingsPage } from '../src/components/pages/SettingsPage';
import { ThemeProvider } from '../src/components/theme-provider';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import React from 'react';

// --- Global Mocks ---
// Mock toast notifications to verify UI feedback without side effects
vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

describe('SettingsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    // --- IPC Mocking Setup ---
    // Simulates the main process responses for app configuration and state
    vi.mocked(window.ipcRenderer.invoke).mockImplementation((channel: string) => {
      if (channel === 'get-server-info') {
        return Promise.resolve({ name: 'Test Device', id: '123', os: 'win32' });
      }
      if (channel === 'get-upload-dir') {
        return Promise.resolve('C:\\Downloads\\ExLink');
      }
      if (channel === 'get-server-status') {
        return Promise.resolve({ running: true });
      }
      return Promise.resolve({});
    });
  });

  // Test Case: Validates basic component mounting and static text rendering
  it('renders settings title', async () => {
    await act(async () => {
      render(
        <ThemeProvider>
          <SettingsPage />
        </ThemeProvider>
      );
    });

    expect(screen.getByText('Settings')).toBeInTheDocument();
  });

  // Test Case: Verifies that identity data fetched via IPC is correctly populated in the UI
  it('loads and displays device name', async () => {
    await act(async () => {
      render(
        <ThemeProvider>
          <SettingsPage />
        </ThemeProvider>
      );
    });

    await waitFor(() => {
      expect(screen.getByText('Test Device')).toBeInTheDocument();
    });
  });

  // Test Case: Ensures the current download path is visible (extracts leaf folder name)
  it('displays the save folder', async () => {
    await act(async () => {
      render(
        <ThemeProvider>
          <SettingsPage />
        </ThemeProvider>
      );
    });

    await waitFor(() => {
      // In SettingsPage, 'C:\Downloads\ExLink' usually displays as just 'ExLink' 
      // via the .pop() logic on path separators.
      const elements = screen.getAllByText(/ExLink/i);
      expect(elements.length).toBeGreaterThan(0);
    });
  });
});


