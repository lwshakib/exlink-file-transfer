# <img src="desktop/public/logo.svg" width="32" vertical-align="middle" /> Contributing to ExLink

Thank you for your interest in contributing to **ExLink File Transfer**! We are excited to have you join our community. Whether you're fixing a bug, suggesting a feature, or helping with documentation, every contribution counts toward making ExLink the best local transfer tool.

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
git clone https://github.com/lwshakib/exlink-file-transfer.git
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

### 🌿 Branching Strategy
We follow a feature-branch workflow. Please use descriptive names:
- `feat/feature-name` for new features.
- `fix/bug-name` for bug fixes.
- `docs/topic-name` for documentation improvements.
- `refactor/component-name` for code refactoring.

### 📝 Commit Messages
We follow [Conventional Commits](https://www.conventionalcommits.org/). This helps us generate clean changelogs.
- `feat: add support for drag-and-drop folders`
- `fix: resolved discovery timeout on slow networks`
- `chore: updated dependencies`

### 💻 Coding Standards
- **TypeScript First**: All new code should be fully typed. Avoid using `any` and prefer interface/type definitions.
- **Clean Code**: Follow the existing coding style. We use ESLint and Prettier for consistency.
- **Performance Matters**: Since this is a file transfer app, always consider the performance impact of your changes (e.g., memory usage during large transfers, UI responsiveness).
- **Component isolation**: Keep UI components small and reusable.

### 🧪 Testing Your Changes
- **Local Interoperability**: If you change the protocol, test both Desktop-to-Mobile and Mobile-to-Desktop transfers.
- **Cross-Platform**: If possible, test on both Android and iOS for mobile changes, and Windows/Linux/macOS for desktop changes.
- **Linting**: Ensure your code passes linting before submitting a PR:
  - **Desktop**: `npm run lint`
  - **Mobile**: `npm run lint`

---

## 📥 Submitting a Pull Request

1.  **Sync your fork**: Ensure your fork is up-to-date with the `main` branch.
2.  **Create a Branch**: Use the naming convention mentioned above.
3.  **Commit with intention**: Make small, focused commits.
4.  **Open PR**: Provide a clear description of:
    - What problem you're solving.
    - How you've implemented the solution.
    - How you've tested it.
    - Include screenshots/videos for UI changes.

### ✅ PR Checklist
- [ ] My code follows the style guidelines of this project.
- [ ] I have performed a self-review of my own code.
- [ ] I have commented my code, particularly in hard-to-understand areas.
- [ ] I have made corresponding changes to the documentation.
- [ ] My changes generate no new warnings.
- [ ] I have tested my changes across at least two devices.

---

## 🗺️ Contribution Areas

We are currently looking for help with:
- **🔒 Security**: Implementation of TLS for local transfers and a trusted device model.
- **⚡ Performance**: Enhancing streaming throughput for ultra-large files (4GB+).
- **🎨 UI/UX**: Improving the accessibility and responsiveness of the dashboard.
- **🌐 Localization**: Adding support for multiple languages (i18n).

---

## ⚖️ Code of Conduct

By participating in this project, you agree to abide by our [Code of Conduct](./CODE_OF_CONDUCT.md).

## 🛡️ Security

If you discover a security vulnerability, please **do not** open a public issue. Instead, contact the maintainer or reach out to **LW Shakib** privately via GitHub.

---

Thank you for making ExLink better! 🚀
