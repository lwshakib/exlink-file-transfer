/// <reference types="vite/client" />

interface Window {
  ipcRenderer: {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    on(channel: string, listener: (event: any, ...args: any[]) => void): () => void;
    off(channel: string): void;
    send(channel: string, ...args: unknown[]): void;
    invoke(channel: string, ...args: unknown[]): Promise<unknown>;
  };
}
