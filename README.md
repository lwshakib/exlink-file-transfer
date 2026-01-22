# ExLink File Transfer

Cross‑platform local network file transfer between **Desktop (Electron)** and **Mobile (Expo/React Native)**.

- **Desktop app**: `desktop/` (Electron + React + TypeScript + Vite)
- **Mobile app**: `mobile/` (Expo Router + React Native Paper + TypeScript)

## What it does

- **Discover devices** on the same Wi‑Fi/LAN
- **Pair (accept/decline)** before a transfer starts
- **Transfer files** with progress UI
  - Mobile → Desktop: mobile pushes uploads to the desktop server
  - Desktop → Desktop: desktop pushes uploads to the other desktop server
  - Desktop → Mobile: desktop queues, mobile pulls downloads (works around mobile constraints)

## Repository structure

```
exlink-file-transfer/
├── desktop/                 # Electron desktop app
├── mobile/                  # Expo mobile app
├── HOW_IT_WORKS.md          # End-to-end workflow & API (recommended read)
├── CODEBASE_ANALYSIS.md     # Deep dive analysis snapshot
├── CONTRIBUTING.md
├── CODE_OF_CONDUCT.md
└── LICENSE
```

## Network ports & protocol (high level)

- **UDP discovery**: port `41234` (desktop broadcasts; desktop listens)
- **HTTP server**: port `3030` (desktop runs an Express server)

Core endpoints on the desktop server (see `HOW_IT_WORKS.md` for full flows):

- `GET /get-server-info`
- `POST /announce`
- `POST /request-connect`
- `POST /respond-to-connection`
- `GET /check-pairing-requests/:deviceId`
- `POST /upload`
- `GET /transfer-status/:deviceId`
- `GET /download/:deviceId/:fileIndex`
- `GET /transfer-finish/:deviceId`

## Getting started

### Desktop (Electron)

```bash
cd desktop
npm install
npm run dev
```

### Mobile (Expo)

```bash
cd mobile
npm install
npx expo start
```

## Device names (editable + persisted)

- **Desktop**: editable in Desktop Settings; persisted by the Electron main process.
- **Mobile**: editable in Mobile Settings; persisted in AsyncStorage.

The **Receive** screen shows your current device name and uses it during discovery/pairing.

## Security note

This project currently assumes a **trusted local network**:

- Transfers use **plain HTTP** (no TLS)
- No authentication/encryption is enforced at the protocol layer

If you plan to use this beyond trusted LANs, you should add authentication + encryption.

## Contributing

See `CONTRIBUTING.md`. Maintainer GitHub: **LW Shakib**.