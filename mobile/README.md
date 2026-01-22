# ExLink Mobile (Expo)

Expo/React Native mobile app for ExLink file transfer.

## Tech stack

- Expo Router (tabs: Receive / Send / Settings)
- React Native Paper (UI)
- TypeScript

## Run (dev)

```bash
npm install
npx expo start
```

## How the mobile app finds desktops

The mobile app scans the local subnet for a desktop server at:

- `http://{ip}:3030/get-server-info`

When it finds a desktop, it announces itself to the desktop:

- `POST http://{desktopIp}:3030/announce`

## How transfers work (mobile perspective)

- **Send → Desktop**: requests pairing (`POST /request-connect`), then uploads via `POST /upload`
- **Receive from Desktop**: polls for pairing (`GET /check-pairing-requests/:id`), then downloads queued files via `GET /download/:id/:index`

See root `HOW_IT_WORKS.md` for the full flow and endpoint list.

## Device name (editable + persisted)

The device name:

- is editable in **Settings**
- is stored in AsyncStorage under key `deviceName`
- is shown on the **Receive** screen and used during pairing/announce
