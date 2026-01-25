# 🤝 Contributing to ExLink

Thank you for your interest in contributing to **ExLink File Transfer**! We are excited to have you join our community. Whether you're fixing a bug, suggesting a feature, or helping with documentation, every contribution counts.

---

## 🏗️ Project Overview

ExLink is a multi-environment project consisting of:
- **Desktop (`/desktop`)**: Electron + React + TypeScript. Handles network orchestration and local file serving.
- **Mobile (`/mobile`)**: React Native + Expo. Acts as a mobile node for sending and receiving.

Before you start, please familiarize yourself with the [How It Works](./HOW_IT_WORKS.md) guide to understand our discovery and transfer protocols.

---

## 🛠️ Getting Started

### 1. Fork and Clone
Fork the repository on GitHub and clone your fork locally:
```bash
git clone https://github.com/YOUR_USERNAME/exlink-file-transfer.git
cd exlink-file-transfer
```

### 2. Environment Setup
We recommend using **Node.js 18+** and **npm** or **bun**.

**Desktop Setup:**
```bash
cd desktop
npm install
npm run dev
```

**Mobile Setup:**
```bash
cd mobile
npm install
npx expo start
```

---

## 🧪 Development Workflow

### Coding Standards
- **TypeScript First**: All new code should be fully typed. Avoid using `any` and prefer interface/type definitions.
- **Clean Code**: Follow the existing coding style. We use ESLint and Prettier for consistency.
- **Performance Matters**: Since this is a file transfer app, always consider the performance impact of your changes (e.g., memory usage during large transfers).

### Testing Your Changes
- **Local Interoperability**: If you change the protocol, test both Desktop-to-Mobile and Mobile-to-Desktop transfers.
- **Cross-Platform**: If possible, test on both Android and iOS for mobile changes, and Windows/Linux/macOS for desktop changes.

### Linting
Ensure your code passes linting before submitting a PR:
- **Desktop**: `npm run lint`
- **Mobile**: `npm run lint`

---

## 📥 Submitting a Pull Request

1.  **Create a Branch**: Use a descriptive name like `feat/universal-clipboard` or `fix/discovery-timeout`.
2.  **Commit Messages**: Follow [Conventional Commits](https://www.conventionalcommits.org/) (e.g., `feat: add folder transfer support`).
3.  **Documentation**: If you change functionality, update the relevant `README.md` and `HOW_IT_WORKS.md`.
4.  **Open PR**: Provide a clear description of the problem you're solving and how you've tested it. Include screenshots/videos for UI changes.

---

## 🗺️ Contribution Areas

We are currently looking for help with:
- **🔒 Security**: Implementation of TLS for local transfers and a trusted device model.
- **⚡ Performance**: Enhancing streaming throughput for ultra-large files (4GB+).
- **🎨 UI/UX**: Improving the accessibility and responsiveness of the dashboard.
- **🌐 Localization**: Adding support for multiple languages.

---

## ⚖️ Code of Conduct

By participating in this project, you agree to abide by our [Code of Conduct](./CODE_OF_CONDUCT.md).

## 🛡️ Security

If you discover a security vulnerability, please **do not** open a public issue. Instead, email the maintainer or contact **LW Shakib** via GitHub.

---

Thank you for making ExLink better! 🚀
