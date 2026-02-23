import { app, BrowserWindow, ipcMain, shell, dialog } from 'electron';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import express, { Request, Response } from 'express';
import cors from 'cors';
import fs from 'node:fs';
import os from 'node:os';
import dgram from 'node:dgram';
import http from 'node:http';
import { uniqueNamesGenerator, adjectives, animals } from 'unique-names-generator';
import { Transform, PassThrough } from 'node:stream';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// The built directory structure
process.env.APP_ROOT = path.join(__dirname, '..');

export const VITE_DEV_SERVER_URL = process.env['VITE_DEV_SERVER_URL'];
export const MAIN_DIST = path.join(process.env.APP_ROOT, 'dist-electron');
export const RENDERER_DIST = path.join(process.env.APP_ROOT, 'dist');

process.env.VITE_PUBLIC = VITE_DEV_SERVER_URL
  ? path.join(process.env.APP_ROOT, 'public')
  : RENDERER_DIST;

// --- Constants & Global State ---
let win: BrowserWindow | null;
const HTTP_PORT = 3030; // Dedicated port for file transfers and handshake
const DISCOVERY_PORT = 41234; // UDP port for LAN discovery packets
const DISCOVERY_INTERVAL = 3000; // Time between heartbeat broadcasts

// Identity Persistence: Stores the unique station name generated for this PC
const configPath = path.join(app.getPath('userData'), 'server-config.json');
let serverName = os.hostname();
// Dynamic Identity: Calculated from the current network IP to avoid hard-coded IDs
let serverId = '';

function getServerIdFromIp() {
  const ip = getLocalIPs()[0];
  if (ip && ip.includes('.')) {
    const parts = ip.split('.');
    return parts[parts.length - 1];
  }
  return '000';
}

// Persistence Logic: Ensures the server name and last used folder are restored on startup
function loadConfig() {
  try {
    if (fs.existsSync(configPath)) {
      const data = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
      if (data.name) serverName = data.name;
      if (data.uploadDir) uploadDir = data.uploadDir;
      // Note: We don't persist serverId; it's derived from IP to ensure LAN uniqueness
    } else {
      // First Run Experience: Generate a friendly "Adjective Animal" name (e.g., "Silver Fox")
      serverName = uniqueNamesGenerator({
        dictionaries: [adjectives, animals],
        length: 2,
        separator: ' ',
        style: 'capital',
      });
      saveConfig();
    }
    serverId = getServerIdFromIp();
    loadUploadDir();
  } catch (e) {
    console.error('Failed to load config:', e);
  }
}

function saveConfig() {
  try {
    fs.writeFileSync(configPath, JSON.stringify({ name: serverName, id: serverId }));
  } catch (e) {
    console.error('Failed to save config:', e);
  }
}

// Ensure identity is loaded immediately as app boots
app.whenReady().then(() => {
  loadConfig();
});

// File Storage Setup
let uploadDir = path.join(os.homedir(), 'Downloads', 'ExLink');
function loadUploadDir() {
  try {
    if (fs.existsSync(configPath)) {
      const data = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
      if (data.uploadDir) {
        uploadDir = data.uploadDir;
      }
    }
  } catch (e) {
    console.error('Failed to load upload dir:', e);
  }
  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
  }
}
loadUploadDir();

interface NearbyNode {
  type: string;
  id: string;
  name: string;
  ip: string;
  port: number;
  platform: string;
  os: string;
  lastSeen: number;
  brand?: string;
}

interface PendingConnection {
  res: Response;
  name: string;
  deviceId: string;
  platform: string;
  brand?: string;
  totalFiles: number;
  totalSize: number;
  files: FileItem[];
  timestamp: number;
}

interface OutgoingRequest {
  deviceId: string;
  deviceIp?: string;
  timestamp: number;
  files?: FileItem[];
}

interface FileItem {
  name: string;
  path: string;
  size: number;
  type?: string;
}

// State Management
const activeRequests = new Map<string, Request>();
const nearbyNodes = new Map<string, NearbyNode>();
const pendingConnections = new Map<string, PendingConnection>();
const outgoingRequests = new Map<string, OutgoingRequest>();
const activeTransfers = new Map<string, { controller: AbortController; files: FileItem[] }>();
const pendingDownloads = new Map<string, { files: FileItem[]; timestamp: number }>();
let serverRunning = true;
let httpServer: http.Server | null = null;
let udpBroadcastInterval: NodeJS.Timeout | null = null;

// --- Discovery Protocol (UDP) ---
// This service broadcasts the PC's identity to the LAN and listens for other ExLink stations.
const udpSocket = dgram.createSocket('udp4');
udpSocket.on('error', (err) => console.log(`UDP error:\n${err.stack}`));

// Listener: Parses incoming identity packets and updates the Discovered Devices map
udpSocket.on('message', (msg) => {
  try {
    const data = JSON.parse(msg.toString());
    // Filter: Ignore packets from ourselves
    if (data.type === 'discovery' && data.ip !== getLocalIPs()[0]) {
      nearbyNodes.set(data.id, { ...data, lastSeen: Date.now() });
      // Notify Renderer to update the "Nearby Devices" UI list
      win?.webContents.send('nearby-nodes-updated', Array.from(nearbyNodes.values()));
    }
  } catch (e) {
    console.error('Failed to parse discovery packet:', e);
  }
});

udpSocket.bind(DISCOVERY_PORT, () => {
  udpSocket.setBroadcast(true);
  const startBroadcast = () => {
    if (udpBroadcastInterval) clearInterval(udpBroadcastInterval);
    // Heartbeat: Send identity packet every 3 seconds to stay visible
    udpBroadcastInterval = setInterval(() => {
      if (!serverRunning) return;
      const localIp = getLocalIPs()[0];
      const message = JSON.stringify({
        type: 'discovery',
        id: serverId,
        name: serverName,
        ip: localIp,
        port: HTTP_PORT,
        platform: 'desktop',
        os: os.platform() === 'win32' ? 'Windows' : os.platform() === 'darwin' ? 'MacOS' : 'Linux',
      });
      udpSocket.send(message, 0, message.length, DISCOVERY_PORT, '255.255.255.255');

      // Garbage Collection: Remove stations that haven't sent a packet recently (20s timeout)
      const now = Date.now();
      let changed = false;
      for (const [id, node] of nearbyNodes.entries()) {
        if (now - node.lastSeen > DISCOVERY_INTERVAL * 6.6) {
          nearbyNodes.delete(id);
          changed = true;
        }
      }
      if (changed) win?.webContents.send('nearby-nodes-updated', Array.from(nearbyNodes.values()));
    }, DISCOVERY_INTERVAL);
  };
  startBroadcast();
});

// --- HTTP Server (Express) ---
// Handles large file streams and pairing handshakes via standard HTTP/POST.
const serverApp = express();
serverApp.use(cors());
serverApp.use(express.json());

import busboy from 'busboy';

// Incoming Upload Endpoint: Optimized for high-speed streaming without memory buffering
serverApp.post('/upload', (req: Request, res: Response) => {
  // Session tracking: Use provided ID or generate a fallback
  const transferId = Array.isArray(req.headers['x-transfer-id'])
    ? req.headers['x-transfer-id'][0]
    : (req.headers['x-transfer-id'] as string) || Math.random().toString(36).substring(7);

  activeRequests.set(transferId, req);

  // Busboy Setup: Parsing multipart bodies (files) in real-time
  const headers = { ...req.headers };
  if (!headers['content-type']) {
    headers['content-type'] = 'multipart/form-data';
  }

  const bb = busboy({ headers });
  const totalSize = parseInt(req.headers['content-length'] || '0');
  let receivedBytes = 0;
  let lastUpdateTime = 0;
  const THROTTLE_MS = 100; // Limits IPC packet frequency to 10Hz to prevent UI lockup

  // Progress tracking via raw socket data events (more granular than busboy chunks)
  req.on('data', (chunk: Buffer) => {
    receivedBytes += chunk.length;
    const now = Date.now();
    if (win && (now - lastUpdateTime > THROTTLE_MS || receivedBytes === totalSize)) {
      lastUpdateTime = now;
      win.webContents.send('upload-progress', {
        id: transferId,
        remoteIp: req.socket.remoteAddress?.replace('::ffff:', ''),
        progress: totalSize > 0 ? receivedBytes / totalSize : 0,
        processedBytes: receivedBytes,
        totalBytes: totalSize,
        currentFile: 'Receiving file...',
        currentIndex: 1,
        totalFiles: 1,
      });
    }
  });

  // Event: Busboy identified a file stream in the request body
  bb.on('file', (_, file, info) => {
    const { filename } = info;
    const saveTo = path.join(uploadDir, `${Date.now()}-${filename}`);
    const fstream = fs.createWriteStream(saveTo);

    // Direct pipe to disk: Minimal CPU/RAM overhead
    file.pipe(fstream);

    fstream.on('close', () => {
      // Signal completion to UI and record for history
      if (win) {
        win.webContents.send('upload-complete', {
          id: transferId,
          remoteIp: req.socket.remoteAddress?.replace('::ffff:', ''),
          name: filename,
          size: receivedBytes,
          path: saveTo,
          time: new Date().toLocaleTimeString(),
          progress: 1,
          processedBytes: totalSize,
          totalBytes: totalSize,
        });
      }
    });

    fstream.on('error', (err) => {
      console.error(`[Upload] ❌ fstream ERROR for ${filename}:`, err);
    });
  });

  bb.on('finish', () => {
    activeRequests.delete(transferId);
    if (!res.headersSent) res.json({ status: 'ok' });
  });

  bb.on('error', (err: Error) => {
    activeRequests.delete(transferId);
    if (win) win.webContents.send('upload-error', { id: transferId, error: err.message });
    if (!res.headersSent) res.status(500).json({ error: err.message });
  });

  req.pipe(bb);
});

// Connection Handshake: Remote devices call this to prompt the desktop for a transfer session
serverApp.post('/request-connect', (req, res) => {
  const { deviceId, name, platform, brand, totalFiles, totalSize, files } = req.body;

  // Track the request so we can respond later when the user clicks "Accept"
  pendingConnections.set(deviceId, {
    res,
    name,
    deviceId,
    platform,
    brand,
    totalFiles,
    totalSize,
    files: files || [],
    timestamp: Date.now(),
  });

  // Triggers the "Interaction Dialog" on the desktop UI
  win?.webContents.send('connection-request', {
    deviceId,
    name,
    platform,
    brand,
    totalFiles,
    totalSize,
    files: files || [],
  });
});

ipcMain.handle('get-upload-dir', () => uploadDir);

ipcMain.handle('get-server-status', () => {
  return { running: serverRunning && httpServer !== null };
});

ipcMain.handle('stop-server', () => {
  serverRunning = false;
  stopServer();
  return true;
});

ipcMain.handle('restart-server', () => {
  serverRunning = true;
  restartServer();
  return true;
});

ipcMain.handle('select-save-folder', async () => {
  if (!win) return null;
  const { canceled, filePaths } = await dialog.showOpenDialog(win, {
    properties: ['openDirectory'],
  });
  if (canceled || !filePaths[0]) return null;

  const selectedPath = filePaths[0];
  // Update uploadDir
  if (!fs.existsSync(selectedPath)) {
    fs.mkdirSync(selectedPath, { recursive: true });
  }
  // Save to config
  try {
    const configData = fs.existsSync(configPath)
      ? JSON.parse(fs.readFileSync(configPath, 'utf-8'))
      : {};
    configData.uploadDir = selectedPath;
    fs.writeFileSync(configPath, JSON.stringify(configData));
  } catch (e) {
    console.error('Failed to save upload dir:', e);
  }

  return { path: selectedPath };
});

ipcMain.on('set-server-id', (_event, { id }) => {
  serverId = id;
  saveConfig();
});

ipcMain.handle('get-nearby-nodes', () => {
  return Array.from(nearbyNodes.values());
});

ipcMain.handle('refresh-discovery', () => {
  nearbyNodes.clear();
  const localIp = getLocalIPs()[0];
  const message = JSON.stringify({
    type: 'discovery',
    id: serverId,
    name: serverName,
    ip: localIp,
    port: HTTP_PORT,
    platform: 'desktop',
    os: os.platform() === 'win32' ? 'Windows' : os.platform() === 'darwin' ? 'MacOS' : 'Linux',
  });
  udpSocket.send(message, 0, message.length, DISCOVERY_PORT, '255.255.255.255');
  win?.webContents.send('nearby-nodes-updated', []);
  return true;
});

serverApp.get('/get-server-info', (_req, res) => {
  res.json({
    ip: getLocalIPs()[0],
    port: HTTP_PORT,
    name: serverName,
    hostname: os.hostname(),
    id: serverId,
    platform: 'desktop',
    os: os.platform() === 'win32' ? 'Windows' : os.platform() === 'darwin' ? 'MacOS' : 'Linux',
  });
});

// Pairing Feedback: Remote devices call this to tell the desktop if their handshake was accepted
serverApp.post('/respond-to-connection', (req, res) => {
  const { deviceId, accepted } = req.body;
  console.log(`Connection response from ${deviceId}: ${accepted}`);

  const outgoing = outgoingRequests.get(deviceId);
  if (outgoing) {
    // Branch 1: Response to a request we (the desktop) initiated
    win?.webContents.send('pairing-response', { deviceId, accepted });
    outgoingRequests.delete(deviceId);
    return res.json({ status: 'ok' });
  }

  // Branch 2: Response to a request the remote device initiated (e.g., from mobile)
  const pending = pendingConnections.get(deviceId);
  if (pending) {
    pending.res.json({ status: accepted ? 'accepted' : 'declined' });
    pendingConnections.delete(deviceId);
    return res.json({ status: 'ok' });
  }

  res.status(404).json({ error: 'Request not found' });
});

serverApp.get('/cancel-pairing/:deviceId', (req, res) => {
  const { deviceId } = req.params;
  console.log(`Pairing cancelled by remote device: ${deviceId}`);

  const pending = pendingConnections.get(deviceId);
  if (pending) {
    win?.webContents.send('pairing-cancelled', { deviceId });
    try {
      pending.res.status(499).json({ status: 'cancelled' });
    } catch (e) {
      // Ignore errors if the response was already ended or closed
      console.log('Error sending pairing cancellation response:', e);
    }
    pendingConnections.delete(deviceId);
  }

  res.json({ status: 'ok' });
});

serverApp.get('/cancel-transfer/:deviceId', (req, res) => {
  const { deviceId } = req.params;
  console.log(`Transfer cancelled by remote device: ${deviceId}`);

  // Check active uploads (Desktop as receiver)
  const activeReq = activeRequests.get(deviceId);
  if (activeReq) {
    activeReq.destroy();
    activeRequests.delete(deviceId);
    win?.webContents.send('transfer-error', { deviceId, error: 'Cancelled by remote device' });
  }

  // Check active downloads (Desktop as sender)
  const transfer = activeTransfers.get(deviceId);
  if (transfer) {
    transfer.controller.abort();
    activeTransfers.delete(deviceId);
    win?.webContents.send('transfer-error', { deviceId, error: 'Cancelled by remote device' });
  }

  res.json({ status: 'ok' });
});

// Termination Endpoint: Signal that a batch transfer session is officially complete
serverApp.get('/transfer-finish/:deviceId', (req, res) => {
  const { deviceId } = req.params;
  if (win) {
    win.webContents.send('transfer-complete', { deviceId });
  }
  res.json({ status: 'ok' });
});

serverApp.post('/announce', (req, res) => {
  const node = req.body;
  if (node.id) {
    nearbyNodes.set(node.id, { ...node, lastSeen: Date.now() });
    win?.webContents.send('nearby-nodes-updated', Array.from(nearbyNodes.values()));
  }
  res.json({ status: 'ok' });
});

// Cleanup stale nodes periodically (remove devices that haven't announced in 15 seconds)
setInterval(() => {
  const now = Date.now();
  let changed = false;
  for (const [id, node] of nearbyNodes.entries()) {
    // Remove nodes that haven't been seen in 15 seconds (mobile announces every 10s)
    if (now - node.lastSeen > 15000) {
      nearbyNodes.delete(id);
      changed = true;
    }
  }
  if (changed) win?.webContents.send('nearby-nodes-updated', Array.from(nearbyNodes.values()));
}, 5000);

// Polling Endpoint (Mobile Compatibility): Mobile devices check this to see if the desktop has a message for them
serverApp.get('/check-pairing-requests/:deviceId', (req, res) => {
  const { deviceId } = req.params;

  // Strategy: We only return "Pending" if the desktop explicitly initiated a connection to this mobile ID
  // This tells the mobile device: "Hey, I (the desktop) am trying to connect to you."
  const outgoing = outgoingRequests.get(deviceId);
  if (outgoing) {
    return res.json({
      status: 'pending',
      request: {
        name: serverName,
        id: serverId,
        os: os.platform() === 'win32' ? 'Windows' : os.platform() === 'darwin' ? 'MacOS' : 'Linux',
        ip: getLocalIPs()[0],
        files: outgoing.files || [],
      },
    });
  }

  // Implementation Note: We avoid returning pending for incoming connections here to prevent duplicate signaling
  res.json({ status: 'none' });
});

serverApp.get('/transfer-status/:deviceId', (req, res) => {
  const { deviceId } = req.params;
  const download = pendingDownloads.get(deviceId);

  if (download) {
    const files = download.files.map((f, i) => ({
      name: f.name,
      size: f.size,
      type: f.type,
      index: i,
    }));
    return res.json({ status: 'ready', files });
  }

  res.json({ status: 'none' });
});

// --- Sequential Download Service (Desktop -> Mobile) ---
// This handles the specialized flow where mobile pulls files one-by-one to avoid memory overflows.
serverApp.get('/download/:deviceId/:fileIndex', (req, res) => {
  const { deviceId, fileIndex } = req.params;
  const index = parseInt(fileIndex);
  const download = pendingDownloads.get(deviceId);

  if (!download || !download.files[index]) {
    return res.status(404).send('File not found');
  }

  const file = download.files[index];
  const { path: filePath, name: fileName } = file;

  if (!fs.existsSync(filePath)) {
    return res.status(404).send('File missing on server');
  }

  const stats = fs.statSync(filePath);
  const fileSize = stats.size;
  const totalBytes = download.files.reduce((acc, f) => acc + (f.size || 0), 0);

  // Calculate previously processed bytes (all files before this one in the current batch)
  const previouslyProcessed = download.files
    .slice(0, index)
    .reduce((acc, f) => acc + (f.size || 0), 0);

  // Standard Headers for Binary Streams
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Expose-Headers', 'Content-Length, Content-Disposition');
  res.setHeader('Content-Type', 'application/octet-stream');
  res.setHeader('Content-Length', fileSize);
  res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);

  let fileProcessed = 0;
  let lastUpdateTime = 0;
  const THROTTLE_MS = 100;
  const fileStream = fs.createReadStream(filePath);

  // Progress Proxy: Intercepts the stream to calculate throughput and overall session progress for the UI
  const progressTracker = new Transform({
    transform(chunk, _encoding, callback) {
      fileProcessed += chunk.length;
      const currentOverallProcessed = previouslyProcessed + fileProcessed;
      const now = Date.now();

      if (win && (now - lastUpdateTime > THROTTLE_MS || fileProcessed === fileSize)) {
        lastUpdateTime = now;
        win.webContents.send('transfer-progress', {
          deviceId,
          progress: currentOverallProcessed / totalBytes,
          fileProgress: fileProcessed / fileSize,
          speed: 0, // Throttle/speed calculation is generally handled by the renderer UI
          currentFile: fileName,
          currentIndex: index + 1,
          totalFiles: download.files.length,
          processedBytes: currentOverallProcessed,
          totalBytes,
        });
      }
      callback(null, chunk);
    },
  });

  fileStream.pipe(progressTracker).pipe(res);

  fileStream.on('error', (err) => {
    console.error(`Stream error for ${fileName}:`, err);
    if (!res.headersSent) res.status(500).send(err.message);
  });

  res.on('finish', () => {
    // If this was the last file in the batch, clear the session and notify UI
    if (index === download.files.length - 1) {
      if (win) win.webContents.send('transfer-complete', { deviceId });
      pendingDownloads.delete(deviceId);
    }
  });
});

const startServer = () => {
  if (httpServer) {
    console.log('Server already running');
    return;
  }
  httpServer = serverApp.listen(HTTP_PORT, '0.0.0.0', () => {
    console.log(`ExLink Server running at http://0.0.0.0:${HTTP_PORT}`);
  });
};

const stopServer = () => {
  if (httpServer) {
    httpServer.close(() => {
      console.log('ExLink Server stopped');
      httpServer = null;
    });
  }
};

const restartServer = () => {
  stopServer();
  setTimeout(() => {
    startServer();
  }, 500);
};

// Start server on init
startServer();

// --- IPC Handlers ---
ipcMain.handle('get-server-info', () => {
  // Freshly calculate ID in case IP changed
  serverId = getServerIdFromIp();
  return {
    ip: getLocalIPs()[0],
    port: HTTP_PORT,
    name: serverName,
    hostname: os.hostname(),
    id: serverId,
  };
});

ipcMain.on('set-server-name', (_event, { name }) => {
  serverName = name;
  saveConfig();
});

ipcMain.handle('initiate-pairing', async (_event, { deviceId, deviceIp, items }) => {
  const node = nearbyNodes.get(deviceId);
  const isMobile = node?.platform === 'mobile' || !node; // Default to polling if unknown/mobile-like

  console.log(
    `Initiating pairing with ${deviceId} (${node?.platform || 'unknown'}) at ${deviceIp}`
  );

  // Notify UI immediately to show the "Waiting" overlay
  win?.webContents.send('pairing-initiated-ui', {
    deviceId,
    deviceIp,
    name: node?.name || 'Device',
    platform: node?.platform || 'mobile',
    brand: node?.brand,
    os: node?.os,
  });

  if (isMobile) {
    // Mobile devices poll us
    outgoingRequests.set(deviceId, {
      deviceId,
      deviceIp,
      timestamp: Date.now(),
      files: items || [],
    });
    return { status: 'waiting' };
  } else {
    // Desktop devices have servers, we can POST directly
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 2000);

      const res = await fetch(`http://${deviceIp}:${HTTP_PORT}/request-connect`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          deviceId: serverId,
          name: serverName,
          platform: 'desktop',
          os:
            os.platform() === 'win32' ? 'Windows' : os.platform() === 'darwin' ? 'MacOS' : 'Linux',
        }),
        signal: controller.signal,
      });
      clearTimeout(timeout);

      if (res.ok) {
        const data = (await res.json()) as { status: string };
        if (data.status === 'accepted') {
          win?.webContents.send('pairing-response', { deviceId, accepted: true });
        } else if (data.status === 'declined') {
          win?.webContents.send('pairing-response', { deviceId, accepted: false });
        }
        return { status: 'sent' };
      }
    } catch (e) {
      console.error(`Failed to POST to desktop ${deviceId}:`, e);
      // Fallback: maybe it's actually acting like a mobile or firewall blocked us
      outgoingRequests.set(deviceId, { deviceId, deviceIp, timestamp: Date.now() });
      return { status: 'waiting' };
    }
  }
  return { status: 'error' };
});

ipcMain.handle('respond-to-connection', (_event, { deviceId, accepted }) => {
  const pending = pendingConnections.get(deviceId);
  if (pending) {
    pending.res.json({ status: accepted ? 'accepted' : 'declined' });
    pendingConnections.delete(deviceId);
    return true;
  }

  // If we are canceling an outgoing request we initiated
  if (!accepted) {
    outgoingRequests.delete(deviceId);
    // Optionally notify the other side if they are polling
  }

  return false;
});

// Transfer Sequence: Initiates the recursive HTTP push flow for Desktop -> Desktop transfers
ipcMain.handle('start-transfer', async (_event, { deviceId, deviceIp, platform, items }) => {
  const controller = new AbortController();
  activeTransfers.set(deviceId, { controller, files: items });

  // Handle Mobile Target: Mobile devices pull files sequentially to avoid memory pressure on handhelds.
  // We simply register them in the local pendingDownloads queue for the mobile to fetch.
  if (platform === 'mobile') {
    pendingDownloads.set(deviceId, { files: items, timestamp: Date.now() });
    return;
  }

  // Handle Desktop Target: Iterate through files and PUSH them via individual POST streams
  const totalBytes = items.reduce((acc: number, item: FileItem) => acc + (item.size || 0), 0);
  let processedBytes = 0;

  try {
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (item.type !== 'file') continue; // Folders are handled by iterating their children

      const { name: fileName, path: filePath, size: fileSize } = item;
      let fileProcessed = 0;
      let fileLastUpdateTime = 0;
      const THROTTLE_MS = 200;

      // Stream Transformer: Calculates progress for the UI while data flows from disk to network
      const progressTracker = new Transform({
        transform(
          chunk: Buffer,
          _encoding: BufferEncoding,
          callback: (error?: Error | null, data?: unknown) => void
        ) {
          fileProcessed += chunk.length;
          const currentTotalProcessed = processedBytes + fileProcessed;
          const now = Date.now();

          // Performance Note: 200ms throttle prevents IPC flooding that could lag the UI
          if (
            win &&
            (now - fileLastUpdateTime > THROTTLE_MS || currentTotalProcessed === totalBytes)
          ) {
            fileLastUpdateTime = now;
            win.webContents.send('transfer-progress', {
              deviceId,
              progress: currentTotalProcessed / totalBytes,
              fileProgress: fileProcessed / fileSize,
              currentFile: fileName,
              currentIndex: i + 1,
              totalFiles: items.length,
              processedBytes: currentTotalProcessed,
              totalBytes,
            });
          }
          callback(null, chunk);
        },
      });

      const fileStream = fs.createReadStream(filePath).pipe(progressTracker);

      // Raw Multipart Generator: Manual boundary injection for high-performance streaming without wrapper overhead
      const boundary = '----ExLinkBoundary' + Math.random().toString(36).substring(2);
      const header = `--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="${fileName}"\r\nContent-Type: application/octet-stream\r\n\r\n`;
      const footer = `\r\n--${boundary}--\r\n`;

      const combinedStream = new PassThrough();
      combinedStream.write(Buffer.from(header));
      fileStream.pipe(combinedStream, { end: false });
      fileStream.on('end', () => {
        combinedStream.write(Buffer.from(footer));
        combinedStream.end();
      });

      const response = await fetch(`http://${deviceIp}:${HTTP_PORT}/upload`, {
        method: 'POST',
        headers: {
          'x-transfer-id': deviceId,
          'Content-Type': `multipart/form-data; boundary=${boundary}`,
        },
        body: combinedStream as unknown as BodyInit,
        duplex: 'half',
        signal: controller.signal,
      } as unknown as RequestInit);

      if (!response.ok) throw new Error(`Failed to upload ${fileName}`);
      processedBytes += fileSize;
    }

    // Success: Notify UI that the entire batch is complete
    win?.webContents.send('transfer-complete', { deviceId });
    activeTransfers.delete(deviceId);
  } catch (e) {
    const error = e as Error;
    if (error.name !== 'AbortError') {
      win?.webContents.send('transfer-error', { deviceId, error: error.message });
    }
    activeTransfers.delete(deviceId);
  }
});

ipcMain.handle('cancel-transfer', (_event, { deviceId, targetIp }) => {
  // 1. Check active transfers (Desktop as sender)
  const transfer = activeTransfers.get(deviceId);
  if (transfer) {
    transfer.controller.abort();
    activeTransfers.delete(deviceId);
  }

  // 2. Check active requests (Desktop as receiver)
  const activeReq = activeRequests.get(deviceId);
  if (activeReq) {
    activeReq.destroy();
    activeRequests.delete(deviceId);
  }

  // 3. Notify remote device if possible
  if (targetIp) {
    const notifyUrl = `http://${targetIp}:3030/cancel-transfer/${serverId}`;
    console.log(`Notifying remote device of cancellation: ${notifyUrl}`);
    fetch(notifyUrl).catch(() => {});
  }

  return true;
});

// --- Native Shell Integration ---
// Allows the React frontend to open local folders and reveal files in Explorer/Finder
ipcMain.handle('open-folder', () => shell.openPath(uploadDir));

ipcMain.handle('open-file', (_event, filePath) => {
  if (filePath && fs.existsSync(filePath)) shell.showItemInFolder(filePath);
});

// Native File Pickers: Opens the OS dialog for file/directory selection
ipcMain.handle('share-files', async () => {
  if (!win) return;
  const { canceled, filePaths } = await dialog.showOpenDialog(win, {
    properties: ['openFile', 'multiSelections'],
  });
  if (canceled) return;
  const sharedItems: { path: string; name: string; size: number }[] = [];
  for (const filePath of filePaths) {
    const stats = fs.statSync(filePath);
    sharedItems.push({
      path: filePath,
      name: path.basename(filePath),
      size: stats.size,
    });
  }
  return sharedItems;
});

ipcMain.handle('share-folders', async () => {
  if (!win) return;
  const { canceled, filePaths } = await dialog.showOpenDialog(win, {
    properties: ['openDirectory', 'multiSelections'],
  });
  if (canceled) return;
  const sharedItems: { path: string; name: string; size: number }[] = [];
  for (const filePath of filePaths) {
    sharedItems.push({
      path: filePath,
      name: path.basename(filePath),
      size: 0, // Folders don't have a simple size
    });
  }
  return sharedItems;
});

// --- Window Control Listeners ---
// Subscribed to by the custom TitleBar component in the React frontend
ipcMain.on('window-minimize', () => win?.minimize());
ipcMain.on('window-maximize', () => {
  if (win?.isMaximized()) win.unmaximize();
  else win?.maximize();
});
ipcMain.on('window-close', () => win?.close());

function getLocalIPs() {
  const interfaces = os.networkInterfaces();
  const ips: string[] = [];
  for (const name of Object.keys(interfaces)) {
    if (name.toLowerCase().includes('virtual') || name.toLowerCase().includes('docker')) continue;
    const iface = interfaces[name];
    if (!iface) continue;
    for (const addr of iface) {
      if (addr.family === 'IPv4' && !addr.internal) ips.push(addr.address);
    }
  }
  ips.sort((a, b) => {
    const score = (ip: string) => (ip.startsWith('192.168.') ? 100 : ip.startsWith('10.') ? 90 : 0);
    return score(b) - score(a);
  });
  return ips.length > 0 ? [ips[0]] : ['127.0.0.1'];
}

// Platform-specific icon paths
const getIconPath = (): string => {
  const platform = process.platform;
  const basePath = process.env.APP_ROOT;

  switch (platform) {
    case 'win32':
      return path.join(basePath, 'public', 'icons', 'win', 'icon.ico');
    case 'darwin':
      return path.join(basePath, 'public', 'icons', 'mac', 'icon.icns');
    case 'linux':
    default:
      return path.join(basePath, 'public', 'icons', 'png', '256x256.png');
  }
};

const iconPath = getIconPath();

process.env.VITE_PUBLIC = VITE_DEV_SERVER_URL
  ? path.join(process.env.APP_ROOT, 'public')
  : RENDERER_DIST;

// --- Main Process Lifecycle ---
function createWindow() {
  win = new BrowserWindow({
    icon: iconPath,
    frame: false, // Frameless window for custom glassmorphism styling
    width: 1000,
    height: 700,
    minWidth: 800,
    minHeight: 600,
    webPreferences: {
      preload: path.join(__dirname, 'preload.mjs'),
      nodeIntegration: true,
      contextIsolation: true,
    },
  });

  if (VITE_DEV_SERVER_URL) {
    win.loadURL(VITE_DEV_SERVER_URL);
    win.webContents.openDevTools();
  } else {
    win.loadFile(path.join(RENDERER_DIST, 'index.html'));
  }
}

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
    win = null;
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});

app.whenReady().then(createWindow);
