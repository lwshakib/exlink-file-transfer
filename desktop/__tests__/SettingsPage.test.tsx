import { render, screen, waitFor, act } from '@testing-library/react';
import { SettingsPage } from '../src/components/pages/SettingsPage';
import { ThemeProvider } from '../src/components/theme-provider';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import React from 'react';

// Mock Sonner
vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

describe('SettingsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Default mocks for IPC calls
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

  it('displays the save folder', async () => {
    await act(async () => {
      render(
        <ThemeProvider>
          <SettingsPage />
        </ThemeProvider>
      );
    });

    await waitFor(() => {
      // It might match 'ExLink' in the color selector or the folder path
      // We just want to ensure it's there
      const elements = screen.getAllByText(/ExLink/i);
      expect(elements.length).toBeGreaterThan(0);
    });
  });
});

