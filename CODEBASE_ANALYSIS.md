# ExLink File Transfer - Comprehensive Codebase Analysis

## 📋 Executive Summary

**ExLink** is a cross-platform file transfer application that enables seamless file sharing between desktop and mobile devices over a local network. The project consists of two main applications:

1. **Desktop Application** - Built with Electron, React, TypeScript, and Tailwind CSS
2. **Mobile Application** - Built with React Native, Expo, and React Native Paper

---

## 🏗️ Project Structure

```
exlink-file-transfer/
├── desktop/                    # Electron desktop application
│   ├── electron/              # Electron main process
│   │   ├── main.ts           # Main process logic (718 lines)
│   │   ├── preload.ts        # Preload script for IPC
│   │   └── electron-env.d.ts # Type definitions
│   ├── src/                   # React renderer process
│   │   ├── App.tsx           # Main app component (647 lines)
│   │   ├── components/       # UI components (59 files)
│   │   │   ├── pages/        # Page components
│   │   │   ├── ui/           # Reusable UI components (shadcn/ui)
│   │   │   └── common/       # Common components
│   │   ├── hooks/            # Custom React hooks
│   │   ├── lib/              # Utility functions
│   │   └── index.css         # Global styles
│   ├── package.json          # Dependencies and scripts
│   ├── vite.config.ts        # Vite configuration
│   └── electron-builder.json5 # Electron builder config
│
├── mobile/                    # React Native mobile app
│   ├── app/                   # Expo Router pages
│   │   ├── (tabs)/           # Tab navigation screens
│   │   │   ├── send.tsx      # Send screen (697 lines)
│   │   │   ├── receive.tsx   # Receive screen
│   │   │   ├── settings.tsx  # Settings screen
│   │   │   └── _layout.tsx   # Tab layout
│   │   ├── _layout.tsx       # Root layout (161 lines)
│   │   ├── sending.tsx       # Transfer progress screen
│   │   ├── history.tsx       # Transfer history
│   │   └── selection-details.tsx # File selection details
│   ├── hooks/                # Custom hooks
│   │   ├── useSelection.tsx  # Selection state management
│   │   └── useTheme.ts       # Theme hook
│   ├── context/              # React context providers
│   │   └── ThemeContext.tsx  # Theme provider
│   ├── constants/            # App constants
│   ├── package.json          # Dependencies
│   └── app.json              # Expo configuration
│
├── README.md                  # Project readme
├── LICENSE                    # License file
└── .gitignore                # Git ignore rules
```

---

## 🎯 Core Features

### 1. **Device Discovery**
- **UDP Broadcasting** (Desktop): Broadcasts presence on port 41234 every 3 seconds
- **HTTP Polling** (Mobile): Scans subnet for desktop servers on port 3030
- **Bidirectional Announcement**: Mobile devices announce themselves to discovered desktops
- **Auto-refresh**: Stale devices removed after 20 seconds of inactivity

### 2. **Pairing System**
- **Connection Request Flow**: Initiator sends pairing request to target device
- **Accept/Decline UI**: Beautiful modal dialogs for pairing approval
- **Polling Mechanism**: Mobile devices poll for pending requests
- **Timeout Handling**: Automatic cleanup of expired pairing requests

### 3. **File Transfer**
- **Multiple File Types**: Files, folders, images, videos, text, clipboard content
- **Progress Tracking**: Real-time progress updates with speed calculation
- **Chunked Upload**: Multipart form data with boundary-based streaming
- **Mobile Download Queue**: Files queued for mobile devices to pull
- **Cancel Support**: Ability to cancel transfers mid-flight

### 4. **User Interface**
- **Desktop**: Modern Electron app with custom titlebar, dark mode support
- **Mobile**: Material Design 3 with React Native Paper
- **Animations**: Smooth transitions using Framer Motion (desktop) and Reanimated (mobile)
- **Responsive**: Adapts to different screen sizes

---

## 🔧 Technology Stack

### Desktop Application

| Category | Technology | Purpose |
|----------|-----------|---------|
| **Framework** | Electron 30.0.1 | Cross-platform desktop app |
| **UI Library** | React 18.2.0 | Component-based UI |
| **Language** | TypeScript 5.2.2 | Type safety |
| **Styling** | Tailwind CSS 4.1.18 | Utility-first CSS |
| **Build Tool** | Vite 5.1.6 | Fast development & bundling |
| **UI Components** | Radix UI | Accessible component primitives |
| **Animations** | Motion 12.27.5 | Declarative animations |
| **HTTP Server** | Express 5.2.1 | File transfer server |
| **File Upload** | Multer 2.0.2 | Multipart file handling |
| **Notifications** | Sonner 2.0.7 | Toast notifications |
| **Forms** | React Hook Form 7.71.1 | Form state management |
| **Validation** | Zod 4.3.5 | Schema validation |

### Mobile Application

| Category | Technology | Purpose |
|----------|-----------|---------|
| **Framework** | Expo 54.0.31 | React Native development |
| **UI Library** | React 19.1.0 | Component-based UI |
| **Language** | TypeScript 5.9.2 | Type safety |
| **Navigation** | Expo Router 6.0.21 | File-based routing |
| **UI Components** | React Native Paper 5.14.5 | Material Design 3 |
| **Animations** | Reanimated 4.1.1 | Native animations |
| **Gestures** | Gesture Handler 2.28.0 | Touch interactions |
| **Bottom Sheets** | @gorhom/bottom-sheet 5.x | Modal bottom sheets |
| **Storage** | AsyncStorage 2.2.0 | Persistent storage |
| **File Picking** | expo-document-picker 14.0.8 | File selection |
| **Image Picking** | expo-image-picker 17.0.10 | Media selection |
| **Network** | expo-network 8.0.8 | Network info |

---

## 🔌 Architecture & Communication

### Network Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Local Network (WiFi)                      │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌──────────────────┐              ┌──────────────────┐     │
│  │  Desktop App     │              │   Mobile App     │     │
│  │  (Electron)      │              │   (React Native) │     │
│  ├──────────────────┤              ├──────────────────┤     │
│  │                  │              │                  │     │
│  │ UDP Broadcaster  │─────────────▶│ HTTP Scanner     │     │
│  │ Port: 41234      │  Discovery   │ Port: 3030       │     │
│  │                  │              │                  │     │
│  │ HTTP Server      │◀─────────────│ HTTP Client      │     │
│  │ Port: 3030       │  Transfer    │                  │     │
│  │                  │              │                  │     │
│  └──────────────────┘              └──────────────────┘     │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

### Discovery Protocol

**Desktop (UDP Broadcast)**:
```javascript
// Broadcasts every 3 seconds on port 41234
{
  type: 'discovery',
  id: '192',           // Last octet of IP
  name: 'Brave Panda', // Friendly name
  ip: '192.168.1.192',
  port: 3030,
  platform: 'desktop',
  os: 'Windows'        // or 'MacOS', 'Linux'
}
```

**Mobile (HTTP Polling)**:
```javascript
// Scans subnet (192.168.1.1-254) every 15 seconds
// Sends GET to http://{ip}:3030/get-server-info
// On success, announces itself via POST to /announce
{
  id: '100',
  name: 'Mobile Device',
  ip: '192.168.1.100',
  port: 3030,
  platform: 'mobile',
  brand: 'Samsung'
}
```

### Pairing Flow

```
Desktop                          Mobile
   │                               │
   │  1. User selects device       │
   ├──────────────────────────────▶│
   │  POST /request-connect        │
   │  (if desktop-to-desktop)      │
   │                               │
   │  OR stores in outgoingRequests│
   │  (if desktop-to-mobile)       │
   │                               │
   │◀──────────────────────────────┤
   │  2. Mobile polls              │
   │  GET /check-pairing-requests  │
   │                               │
   │  3. Shows accept/decline UI   │
   │                               │
   │◀──────────────────────────────┤
   │  4. Response                  │
   │  POST /respond-to-connection  │
   │  { accepted: true/false }     │
   │                               │
   │  5. Start transfer if accepted│
   │                               │
```

### File Transfer Flow

**Desktop-to-Desktop (Push)**:
```
Sender                          Receiver
   │                               │
   │  POST /upload                 │
   ├──────────────────────────────▶│
   │  multipart/form-data          │
   │  x-transfer-id: {deviceId}    │
   │                               │
   │  Progress events              │
   │◀──────────────────────────────┤
   │  { progress, speed, ... }     │
   │                               │
   │  200 OK                       │
   │◀──────────────────────────────┤
```

**Desktop-to-Mobile (Pull)**:
```
Desktop                         Mobile
   │                               │
   │  Queues files in              │
   │  pendingDownloads Map         │
   │                               │
   │◀──────────────────────────────┤
   │  1. Check status              │
   │  GET /transfer-status/{id}    │
   │                               │
   │  { status: 'ready', files }   │
   ├──────────────────────────────▶│
   │                               │
   │◀──────────────────────────────┤
   │  2. Download each file        │
   │  GET /download/{id}/{index}   │
   │                               │
   │  File stream                  │
   ├──────────────────────────────▶│
```

---

## 📁 Key Files Analysis

### Desktop: `electron/main.ts` (718 lines)

**Responsibilities**:
- HTTP server setup (Express on port 3030)
- UDP discovery broadcasting
- File upload handling with Multer
- Pairing request management
- IPC communication with renderer
- File transfer orchestration

**Key Functions**:
- `getLocalIPs()`: Retrieves local network IP addresses
- `loadConfig()`: Loads persistent device identity
- `createWindow()`: Creates Electron browser window
- Upload endpoint: `/upload` - Receives files from other devices
- Pairing endpoints: `/request-connect`, `/respond-to-connection`
- Download endpoint: `/download/:deviceId/:fileIndex` - Serves files to mobile

**State Management**:
```typescript
const activeRequests = new Map<string, Request>()
const nearbyNodes = new Map<string, any>()
const pendingConnections = new Map<string, any>()
const outgoingRequests = new Map<string, any>()
const activeTransfers = new Map<string, { controller, files }>()
const pendingDownloads = new Map<string, { files, timestamp }>()
```

### Desktop: `src/App.tsx` (647 lines)

**Responsibilities**:
- Main application UI structure
- Tab navigation (Receive, Send, Settings)
- Transfer progress UI
- Pairing request dialogs
- IPC event handling

**Key Features**:
- Custom titlebar with window controls
- Transfer overlay with progress bars
- Pairing approval modal
- Waiting for response overlay
- Speed calculation (1-second intervals)
- Duration tracking

**State**:
```typescript
const [activeTab, setActiveTab] = useState<"receive" | "send" | "settings">("send")
const [pendingRequest, setPendingRequest] = useState<...>()
const [waitingFor, setWaitingFor] = useState<...>()
const [transferData, setTransferData] = useState<...>()
const [currentSpeed, setCurrentSpeed] = useState(0)
```

### Desktop: `src/components/pages/SendPage.tsx` (442 lines)

**Responsibilities**:
- File/folder/text selection UI
- Device discovery display
- Selection management
- Pairing initiation

**Key Features**:
- 4 selection types: File, Folder, Text, Paste
- Device list with platform icons
- Selection summary card
- Details view for editing selection
- Add menu dialog

### Mobile: `app/_layout.tsx` (161 lines)

**Responsibilities**:
- Root layout and providers
- Theme management
- Global discovery service
- Navigation setup

**Key Features**:
- Subnet scanning on mount
- Periodic announcements to known desktops
- Theme switching (light/dark)
- Multiple theme variations

**Discovery Logic**:
```typescript
// Scans 192.168.x.1-254 in batches of 40
// Timeout: 400ms per IP
// Announces to discovered desktops every 10s
// Full scan every 45s
```

### Mobile: `app/(tabs)/send.tsx` (697 lines)

**Responsibilities**:
- File selection UI
- Device discovery
- Transfer initiation

**Key Features**:
- 6 selection types: File, Media, Paste, Text, Folder, App
- Pull-to-refresh for device scan
- Bottom sheet for adding items
- Selection summary card
- Device list with badges

### Mobile: `hooks/useSelection.tsx` (69 lines)

**Responsibilities**:
- Centralized selection state
- Add/remove items
- Calculate total size

**Interface**:
```typescript
interface SelectedItem {
  id: string
  name: string
  size: number
  type: 'file' | 'media' | 'text' | 'folder' | 'app'
  uri?: string
  content?: string
}
```

---

## 🎨 Design System

### Desktop (Tailwind CSS)

**Color Scheme**:
- Uses CSS custom properties for theming
- `--accent-primary`: Primary accent color
- `--accent-secondary`: Secondary accent color
- `--accent-glow`: Glow effect color
- Dark mode support via `next-themes`

**Components**:
- Built with Radix UI primitives
- Styled with Tailwind utility classes
- Consistent spacing and typography
- Smooth animations with Framer Motion

### Mobile (Material Design 3)

**Themes**:
- Multiple color variations (defined in `constants/Colors`)
- Light and dark modes
- Adaptive navigation theme
- Paper components for consistency

**Layout**:
- Safe area handling
- Bottom sheet modals
- Tab navigation
- Gesture-based interactions

---

## 🔐 Security Considerations

### Current Implementation

1. **No Authentication**: Devices trust each other on the same network
2. **No Encryption**: Files transferred in plain HTTP
3. **No Access Control**: Any device can connect if on same network
4. **Local Network Only**: Relies on network isolation for security

### Potential Improvements

- [ ] Add device pairing with PIN codes
- [ ] Implement HTTPS/TLS for transfers
- [ ] Add file encryption at rest
- [ ] Implement device whitelisting
- [ ] Add transfer history with audit logs

---

## 📊 Performance Characteristics

### Desktop

- **Discovery**: UDP broadcast every 3 seconds
- **Stale Timeout**: 20 seconds (6.6 × discovery interval)
- **Progress Throttle**: 200ms between updates
- **Transfer**: Streaming with progress tracking
- **Memory**: Minimal buffering with streams

### Mobile

- **Subnet Scan**: 254 IPs in batches of 40
- **Scan Timeout**: 400-600ms per IP
- **Full Scan Duration**: ~15-20 seconds
- **Periodic Scan**: Every 45 seconds
- **Announcement**: Every 10 seconds to known desktops

---

## 🐛 Known Issues & Limitations

### Desktop

1. **Virtual Adapters**: Filters out virtual/Docker interfaces but may miss some
2. **Firewall**: May block UDP broadcasts or HTTP server
3. **Multiple IPs**: Prioritizes 192.168.x.x and 10.x.x.x subnets
4. **Transfer Cancellation**: Cleanup may not be immediate

### Mobile

1. **Battery Drain**: Continuous scanning impacts battery
2. **Network Permission**: Requires WiFi access
3. **Background Scanning**: May not work when app is backgrounded
4. **iOS Limitations**: Network scanning more restricted on iOS

---

## 🚀 Build & Deployment

### Desktop

**Development**:
```bash
cd desktop
npm install
npm run dev
```

**Production Build**:
```bash
npm run build
# Creates installers in dist/ directory
```

**Supported Platforms**:
- Windows (NSIS installer)
- macOS (DMG)
- Linux (AppImage, deb, rpm)

### Mobile

**Development**:
```bash
cd mobile
npm install
npx expo start
```

**Build**:
```bash
# Android
npx expo build:android

# iOS
npx expo build:ios
```

**Supported Platforms**:
- Android 5.0+ (API 21+)
- iOS 13.0+

---

## 📝 Code Quality

### TypeScript Usage

- **Desktop**: Strict mode enabled, comprehensive type definitions
- **Mobile**: TypeScript with Expo, type-safe routing
- **Shared Types**: `SelectedItem`, `NearbyNode`, etc.

### Code Organization

- **Separation of Concerns**: Clear separation between UI, logic, and networking
- **Component Reusability**: Shared UI components (desktop: shadcn/ui, mobile: Paper)
- **State Management**: React hooks and context for state
- **Error Handling**: Try-catch blocks, error boundaries

### Testing

- **Current State**: No automated tests
- **Recommendations**:
  - Unit tests for utility functions
  - Integration tests for file transfer
  - E2E tests for pairing flow

---

## 🔄 Data Flow

### Selection Flow

```
User Action
    ↓
File Picker / Input
    ↓
useSelection Hook
    ↓
selectedItems State
    ↓
UI Update (Summary Card)
    ↓
Transfer Initiation
```

### Transfer Flow

```
Device Selection
    ↓
Pairing Request
    ↓
Approval Dialog
    ↓
Transfer Start
    ↓
Progress Updates (IPC/HTTP)
    ↓
UI Progress Bar
    ↓
Transfer Complete
    ↓
Notification
```

---

## 🎯 Future Enhancements

### High Priority

1. **Transfer History**: Persistent log of all transfers
2. **Resume Support**: Resume interrupted transfers
3. **Compression**: Optional file compression
4. **Favorites**: Save frequently used devices

### Medium Priority

5. **QR Code Pairing**: Quick pairing via QR scan
6. **Folder Transfer**: Proper folder structure preservation
7. **Batch Operations**: Queue multiple transfers
8. **Settings Sync**: Sync preferences across devices

### Low Priority

9. **Cloud Backup**: Optional cloud storage integration
10. **File Preview**: Preview files before transfer
11. **Themes**: More theme variations
12. **Localization**: Multi-language support

---

## 📚 Dependencies Overview

### Desktop Critical Dependencies

- `electron`: Desktop app framework
- `express`: HTTP server
- `multer`: File upload handling
- `react`: UI library
- `tailwindcss`: Styling
- `motion`: Animations

### Mobile Critical Dependencies

- `expo`: React Native framework
- `expo-router`: File-based routing
- `react-native-paper`: UI components
- `expo-document-picker`: File selection
- `expo-network`: Network utilities
- `@gorhom/bottom-sheet`: Bottom sheets

---

## 🔍 Code Metrics

### Desktop

- **Total Files**: ~87 files
- **Main Process**: 718 lines (main.ts)
- **Renderer**: 647 lines (App.tsx)
- **Components**: 59 UI components
- **Languages**: TypeScript, CSS

### Mobile

- **Total Files**: ~22 files
- **Screens**: 8 screens
- **Largest Screen**: 697 lines (send.tsx)
- **Hooks**: 2 custom hooks
- **Languages**: TypeScript, TSX

---

## 🎓 Learning Resources

### For Contributors

1. **Electron**: https://www.electronjs.org/docs
2. **React**: https://react.dev
3. **Expo**: https://docs.expo.dev
4. **Tailwind CSS**: https://tailwindcss.com/docs
5. **React Native Paper**: https://callstack.github.io/react-native-paper

### Key Concepts

- **IPC Communication**: Electron's inter-process communication
- **UDP Broadcasting**: Network discovery protocol
- **Multipart Upload**: File transfer with progress
- **React Context**: State management
- **Expo Router**: File-based navigation

---

## 📞 Support & Contribution

### Getting Help

- Review this analysis document
- Check the README files in each directory
- Examine code comments in key files
- Test the application locally

### Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly (desktop + mobile)
5. Submit a pull request

---

## 📄 License

This project is licensed under the MIT License. See the LICENSE file for details.

---

**Last Updated**: January 21, 2026
**Analyzed By**: Antigravity AI Assistant
**Version**: 1.0.0
