import '@testing-library/jest-dom';
import { vi } from 'vitest';

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

// Mock Electron window properties
const ipcRendererMock = {
  send: vi.fn(),
  on: vi.fn(() => vi.fn()), // returns a removeListener function
  invoke: vi.fn(() => Promise.resolve({})),
  removeListener: vi.fn(),
};

Object.defineProperty(window, 'electron', {
  value: {
    ipcRenderer: ipcRendererMock,
  },
});

Object.defineProperty(window, 'ipcRenderer', {
  value: ipcRendererMock,
});

// Mock matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation((query) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(), // deprecated
    removeListener: vi.fn(), // deprecated
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

