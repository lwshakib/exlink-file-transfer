# ExLink Desktop (Electron)

Electron desktop app for ExLink file transfer.

## Tech stack

- Electron (main process: networking + filesystem)
- React + TypeScript (renderer UI)
- Vite + Tailwind (build + styling)

## Run (dev)

```bash
npm install
npm run dev
```

## Build (installers)

```bash
npm run build
```

Outputs are produced by `electron-builder` (see `electron-builder.json5`).

## Networking

The desktop app starts:

- **UDP discovery** on `41234`
- **HTTP server** on `3030` (Express)

If discovery or transfers fail, check OS firewall rules for UDP broadcast and TCP `3030`.

## Where things live

- **Electron main process**: `electron/main.ts`
  - UDP broadcast/listen
  - Express endpoints (`/upload`, `/get-server-info`, pairing, download queue)
  - IPC handlers for the renderer
- **Renderer UI**: `src/App.tsx`
  - Tabs: Receive / Send / Settings
  - Pairing and transfer overlays driven by IPC events

## Device name (editable + persisted)

The device name:

- is editable in **Settings**
- is persisted by the main process to the app config
- is displayed on the **Receive** screen and shared during discovery/pairing

See root `HOW_IT_WORKS.md` for the end-to-end workflow and API.
