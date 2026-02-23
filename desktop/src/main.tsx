import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { SelectionProvider } from './hooks/useSelection.tsx';
import { ThemeProvider } from './components/theme-provider.tsx';

// React Application Bootstrap: Mounts the root component with global providers
ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    {/* ThemeProvider manages CSS-in-JS style variables for Light/Dark and Accent colors */}
    <ThemeProvider defaultTheme="dark" storageKey="vite-ui-theme">
      {/* SelectionProvider synchronizes shared file queues across tabbed views */}
      <SelectionProvider>
        <App />
      </SelectionProvider>
    </ThemeProvider>
  </React.StrictMode>
);

// Use contextBridge
window.ipcRenderer.on('main-process-message', (_event, message) => {
  console.log(message);
});
