import { ipcRenderer, contextBridge, IpcRendererEvent } from 'electron';

// --------- Expose some API to the Renderer process ---------
contextBridge.exposeInMainWorld('ipcRenderer', {
  on(channel: string, listener: (event: IpcRendererEvent, ...args: unknown[]) => void) {
    const subscription = (event: IpcRendererEvent, ...args: unknown[]) => listener(event, ...args);
    ipcRenderer.on(channel, subscription);

    return () => {
      ipcRenderer.removeListener(channel, subscription);
    };
  },
  off(channel: string) {
    ipcRenderer.removeAllListeners(channel);
  },
  send(channel: string, ...args: unknown[]) {
    return ipcRenderer.send(channel, ...args);
  },
  invoke(channel: string, ...args: unknown[]) {
    return ipcRenderer.invoke(channel, ...args);
  },

  // You can expose other APTs you need here.
  // ...
});
