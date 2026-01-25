# 🖥️ ExLink Desktop
### The Central Hub for Local File Transfers

ExLink Desktop is a powerful Electron-based application that serves as the network coordinator for your file transfers. It provides a beautiful, native-feeling interface for discovering devices, managing transfers, and configuring your local node.

---

## 🚀 Key Features
- **High-Performance Server**: Powered by Express.js for low-latency, high-throughput file streaming.
- **Advanced Discovery**: Implements real-time UDP broadcasting for instant visibility on your network.
- **System Integration**: Native file system access for lightning-fast disk I/O.
- **Modern UI**: Built with React and TailwindCSS, featuring a premium dark-themed dashboard.

---

## 🛠️ Tech Stack
- **Framework**: [Electron](https://www.electronjs.org/)
- **Frontend**: [React](https://reactjs.org/) + [TypeScript](https://www.typescriptlang.org/)
- **Build Tool**: [Vite](https://vitejs.dev/)
- **Styling**: [TailwindCSS](https://tailwindcss.com/) + [Shadcn UI](https://ui.shadcn.com/)
- **Networking**: [Express.js](https://expressjs.com/) (Embedded Server)

---

## 📥 Development Setup

### Prerequisites
- **Node.js**: v18.0 or later
- **npm** or **bun**

### Installation
```bash
# Clone the repository (if not already done)
git clone https://github.com/lwshakib/exlink-file-transfer.git
cd exlink-file-transfer/desktop

# Install dependencies
npm install
```

### Running Locally
```bash
# Start the Vite dev server and Electron app
npm run dev
```

### Building for Production
```bash
# Build the production assets and package the app
npm run build
```
Produced files will be available in the `dist` and `release` directories.

---

## 📂 Architecture Overview

- **`electron/main.ts`**: The brain of the application. Handles IPC communication, starts the Express server, and manages UDP discovery pulses.
- **`src/`**: The React-based renderer process.
  - **`components/pages/`**: Contains the primary views (Send, Receive, Settings).
  - **`store/`**: Global state management powered by Zustand.
- **`public/`**: Static assets including icons and branding materials.

---

## 🛰️ Network Configuration

By default, ExLink Desktop uses the following ports:
- **TCP 3030**: Primary HTTP API and file streaming.
- **UDP 41234**: Discovery beacon broadcasting.

> [!IMPORTANT]
> Ensure your OS Firewall allows inbound and outbound traffic on these ports for ExLink to function correctly.

---

## 🔒 Security Note
ExLink Desktop operates exclusively within your Local Area Network (LAN). No data is sent to external servers. Always ensure you are connected to a trusted local network when performing transfers.

---

<p align="center">
  Part of the <strong>ExLink Ecosystem</strong>
</p>
