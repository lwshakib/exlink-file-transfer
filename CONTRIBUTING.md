# Contributing to ExLink

Thanks for contributing to **ExLink File Transfer**!

Maintainer: **LW Shakib**

## Repo overview

- `desktop/`: Electron + React desktop app (UDP discovery + Express server)
- `mobile/`: Expo Router mobile app (subnet scan + upload/download client)

Useful docs:

- `HOW_IT_WORKS.md` (protocol + flows)
- `CODEBASE_ANALYSIS.md` (detailed snapshot)

## Development setup

### Desktop

```bash
cd desktop
npm install
npm run dev
```

### Mobile

```bash
cd mobile
npm install
npx expo start
```

## Code style & quality

- **TypeScript**: keep types explicit around network payloads and IPC boundaries
- **No breaking protocol changes** without updating `HOW_IT_WORKS.md` and keeping old clients in mind
- **Keep UI simple**: avoid adding settings that don’t affect behavior yet

## Linting

Desktop:

```bash
cd desktop
npm run lint
```

Mobile:

```bash
cd mobile
npm run lint
```

## What to work on

Good areas for contributions:

- Reliability: timeouts, retries, cancellation behavior
- Transfer robustness: resume support, folder structure, multiple-file manifest
- Security hardening: auth/token exchange, optional TLS, device trust model
- UX polish: error messages, offline states, device list quality

## Pull requests

- Keep PRs focused (one feature/bug per PR)
- Include screenshots/screen recordings for UI changes
- Mention platform tested: Windows/macOS/Linux + Android/iOS
- Update documentation when behavior changes

## Reporting security issues

Please avoid filing public issues for sensitive security vulnerabilities.
Instead, contact the maintainer (GitHub: **LW Shakib**) with details and reproduction steps.

