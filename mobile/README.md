# 📱 ExLink Mobile
### Seamless File Transfer on the Go

ExLink Mobile is a fast, lightweight companion app built with React Native and Expo. It allows you to discover ExLink Desktop nodes on your network, send files in batches, and receive content with ease.

---

## 🚀 Key Features
- **Smart Discovery**: Automatically scans your local subnet to find active ExLink Desktop hubs.
- **Batch Selection**: Select multiple photos, videos, or documents and send them in one go.
- **Universal Clipboard**: Fast text and link sharing between your phone and your computer.
- **Optimized Download**: Efficient pull-based downloading to ensure reliability even in the background.
- **Native Experience**: Smooth transitions and Haptic feedback integrated for a premium feel.

---

## 🛠️ Tech Stack
- **Framework**: [React Native](https://reactnative.dev/) + [Expo](https://expo.dev/)
- **Navigation**: [Expo Router](https://docs.expo.dev/router/introduction/) (Link-based navigation)
- **UI Components**: [React Native Paper](https://reactnativepaper.com/)
- **State Management**: [Zustand](https://github.com/pmndrs/zustand)
- **Persistence**: [AsyncStorage](https://react-native-async-storage.github.io/async-storage/)

---

## 📥 Development Setup

### Prerequisites
- **Node.js**: v18.0 or later
- **Expo Go App**: Installed on your physical device ([iOS](https://apps.apple.com/app/expo-go/id982107779) / [Android](https://play.google.com/store/apps/details?id=host.exp.exponent))

### Installation
```bash
# Navigate to the mobile directory
cd mobile

# Install dependencies
npm install
```

### Running Locally
```bash
# Start the Expo development server
npx expo start
```
Scan the QR code displayed in your terminal using the **Expo Go** app (Android) or the **Camera app** (iOS).

---

## 🔍 Discovery & Connection Logic

The mobile app employs a strategic discovery process:
1. **Active Scan**: Iterates through the local subnet to find servers responding on Port `3030`.
2. **Identification**: Once a server is found, the mobile device "Announces" itself with its name and platform details.
3. **Session Store**: Detected devices are stored in `useDiscoveryStore` for quick access across the app.

---

## 📂 Project Structure

- **`app/`**: Contains the screen definitions using Expo Router.
  - **`(tabs)/`**: The primary navigation tabs (Send, Receive, Settings).
- **`components/`**: Reusable UI components like `SendingPortal` and `DeviceList`.
- **`store/`**: Global state management for discovery and app settings.
- **`hooks/`**: Custom hooks for managing network requests and local state.

---

## ⚠️ Known Limitations
- **Subnet Matching**: Your mobile device must be on the same Wi-Fi subnet as the desktop hub.
- **Backgrounding**: On some iOS versions, large transfers might pause if the app is sent to the background for an extended period.

---

<p align="center">
  Part of the <strong>ExLink Ecosystem</strong>
</p>
