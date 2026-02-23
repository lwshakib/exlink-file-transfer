import '@testing-library/jest-dom';
import { vi } from 'vitest';

// Global type augmentation for the Electron bridge used in tests
declare global {
  interface Window {
    ipcRenderer: {
      send: (channel: string, ...args: any[]) => void;
      on: (channel: string, func: (...args: any[]) => void) => () => void;
      invoke: (channel: string, ...args: any[]) => Promise<any>;
      removeListener: (channel: string, func: (...args: any[]) => void) => void;
    };
    electron: {
      ipcRenderer: Window['ipcRenderer'];
    };
  }
}

// --- IPC Mocking Strategy ---
// Provides a simulated communication layer for Vitest to interact with Electon-specific APIs
const ipcRendererMock = {
  send: vi.fn(),
  on: vi.fn(() => vi.fn()), // Returns a cleanup function to simulate listener removal
  invoke: vi.fn(() => Promise.resolve({})),
  removeListener: vi.fn(),
};

// Define both 'electron' and 'ipcRenderer' on the window object to match preload/main process injection
Object.defineProperty(window, 'electron', {
  value: {
    ipcRenderer: ipcRendererMock,
  },
});

Object.defineProperty(window, 'ipcRenderer', {
  value: ipcRendererMock,
});

// --- Browser Environment Mocks ---
// matchMedia is not implemented in JSDOM, so we mock it to support responsive design and dark mode tests
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation((query) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(), // Deprecated
    removeListener: vi.fn(), // Deprecated
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});


