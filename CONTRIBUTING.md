# Contributing to ExLink

First off, thank you for considering contributing to **ExLink File Transfer**! Your help makes this project better for everyone.

---

## 🏗️ Repository Architecture

ExLink is split into two main environments:

- **Desktop (`/desktop`)**: An Electron-based application built with React, Vite, and TailwindCSS. It handles device discovery via UDP and hosts an Express server for file transfers.
- **Mobile (`/mobile`)**: A React Native application built with Expo Router and React Native Paper. It scans the network and communicates with the desktop server.

### Core Documentation
- [How It Works](./HOW_IT_WORKS.md): Learn about the protocol, pairing sequence, and transfer flows.
- [Codebase Analysis](./CODEBASE_ANALYSIS.md): A detailed snapshot of the project structure and logic.

---

## 🛠️ Development Setup

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

---

## 🧪 Quality Standards

- **TypeScript**: We heavily rely on TypeScript. Please ensure all new code is properly typed, especially for network payloads and IPC communication.
- **Protocol Integrity**: Avoid making breaking changes to the protocol without updating `HOW_IT_WORKS.md`. We aim for backward compatibility where possible.
- **UI/UX Consistency**: Keep the design simple, premium, and responsive. Before changing major UI elements, please open an issue to discuss.

### Linting
We use ESLint to keep the codebase clean. Please run linting before submitting a PR:

- **Desktop**: `npm run lint` inside the `desktop/` folder.
- **Mobile**: `npm run lint` inside the `mobile/` folder.

---

## 🗺️ What to Work On

We're always looking for help in these areas:
- **Reliability**: Improving connection stability, handling timeouts, and better error recovery.
- **Transfer Features**: Support for folder structure preservation, resuming interrupted transfers, and checksum verification.
- **Security**: Implementing a device trust model, optional TLS support, and token-based authentication.
- **UX Polish**: Better feedback for network issues, cleaner device lists, and localized translations.

---

## 📥 Submitting Your Contribution

1.  **Focus**: Keep PRs focused on a single feature or bug fix.
2.  **Screenshots**: If your change affects the UI, please include screenshots or a short video in the PR description.
3.  **Testing**: Mention which platforms you tested on (e.g., Windows 11 + Android 13).
4.  **Documentation**: Update relevant Markdown files if you change application behavior.

---

## 🛡️ Reporting Security Issues

Please do not report security vulnerabilities through public issues. Instead, contact the maintainer directly via GitHub (**LW Shakib**) to discuss the issue and a potential fix.

---

Thank you for being part of the ExLink community!
