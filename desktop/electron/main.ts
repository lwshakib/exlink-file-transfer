import { app, BrowserWindow, ipcMain, shell, dialog } from 'electron'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import express, { Request, Response } from 'express'
import cors from 'cors'
import multer from 'multer'
import fs from 'node:fs'
import os from 'node:os'
import dgram from 'node:dgram'
import { uniqueNamesGenerator, adjectives, animals } from 'unique-names-generator'
import { Transform, PassThrough } from 'node:stream'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// The built directory structure
process.env.APP_ROOT = path.join(__dirname, '..')

export const VITE_DEV_SERVER_URL = process.env['VITE_DEV_SERVER_URL']
export const MAIN_DIST = path.join(process.env.APP_ROOT, 'dist-electron')
export const RENDERER_DIST = path.join(process.env.APP_ROOT, 'dist')

process.env.VITE_PUBLIC = VITE_DEV_SERVER_URL ? path.join(process.env.APP_ROOT, 'public') : RENDERER_DIST

let win: BrowserWindow | null
const HTTP_PORT = 3030
const DISCOVERY_PORT = 41234
const DISCOVERY_INTERVAL = 3000

// Identity Persistence
const configPath = path.join(app.getPath('userData'), 'server-config.json')
let serverName = os.hostname()
// Default to empty, will be populated from IP
let serverId = "" 

function getServerIdFromIp() {
  const ip = getLocalIPs()[0]
  if (ip && ip.includes('.')) {
    const parts = ip.split('.')
    return parts[parts.length - 1]
  }
  return "000"
}

function loadConfig() {
  try {
    if (fs.existsSync(configPath)) {
      const data = JSON.parse(fs.readFileSync(configPath, 'utf-8'))
      if (data.name) serverName = data.name
      // We don't persist serverId anymore as it depends on the current IP
    } else {
      // First run: generate friendly name
      serverName = uniqueNamesGenerator({
        dictionaries: [adjectives, animals],
        length: 2,
        separator: ' ',
        style: 'capital'
      })
      saveConfig()
    }
    // Always calculate current ID from IP
    serverId = getServerIdFromIp()
  } catch (e) {
    console.error('Failed to load config:', e)
  }
}

function saveConfig() {
  try {
    fs.writeFileSync(configPath, JSON.stringify({ name: serverName, id: serverId }))
  } catch (e) {
    console.error('Failed to save config:', e)
  }
}

// Ensure identity is loaded immediately
app.whenReady().then(() => {
  loadConfig()
})

// File Storage Setup
const uploadDir = path.join(os.homedir(), 'Downloads', 'ExLink')
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true })
}

// State Management
const activeRequests = new Map<string, Request>()
const nearbyNodes = new Map<string, any>()
const pendingConnections = new Map<string, any>()
const outgoingRequests = new Map<string, any>()
const activeTransfers = new Map<string, { controller: AbortController, files: any[] }>()
const pendingDownloads = new Map<string, { files: any[], timestamp: number }>()

// --- Discovery Protocol (UDP) ---
const udpSocket = dgram.createSocket('udp4')
udpSocket.on('error', (err) => console.log(`UDP error:\n${err.stack}`))

udpSocket.on('message', (msg, _rinfo) => {
  try {
    const data = JSON.parse(msg.toString())
    if (data.type === 'discovery' && data.ip !== getLocalIPs()[0]) {
      nearbyNodes.set(data.id, { ...data, lastSeen: Date.now() })
      win?.webContents.send('nearby-nodes-updated', Array.from(nearbyNodes.values()))
    }
  } catch (e) {}
})

udpSocket.bind(DISCOVERY_PORT, () => {
  udpSocket.setBroadcast(true)
  setInterval(() => {
    const localIp = getLocalIPs()[0]
    const message = JSON.stringify({
      type: 'discovery',
      id: serverId,
      name: serverName,
      ip: localIp,
      port: HTTP_PORT,
      platform: 'desktop',
      os: os.platform() === 'win32' ? 'Windows' : os.platform() === 'darwin' ? 'MacOS' : 'Linux'
    })
    udpSocket.send(message, 0, message.length, DISCOVERY_PORT, '255.255.255.255')
    
    // Cleanup stale nodes
    const now = Date.now()
    let changed = false
    for (const [id, node] of nearbyNodes.entries()) {
      // Be more forgiving: 20s timeout (DISCOVERY_INTERVAL * 6.6)
      if (now - node.lastSeen > DISCOVERY_INTERVAL * 6.6) {
        nearbyNodes.delete(id)
        changed = true
      }
    }
    if (changed) win?.webContents.send('nearby-nodes-updated', Array.from(nearbyNodes.values()))
  }, DISCOVERY_INTERVAL)
})

// --- HTTP Server (Express) ---
const serverApp = express()
serverApp.use(cors())
serverApp.use(express.json())

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadDir),
  filename: (_req, file, cb) => cb(null, `${Date.now()}-${file.originalname}`)
})
const upload = multer({ storage })

// Endpoints
serverApp.post('/upload', (req: Request, res: Response) => {
  const transferId = Array.isArray(req.headers['x-transfer-id']) 
    ? req.headers['x-transfer-id'][0] 
    : (req.headers['x-transfer-id'] as string || Math.random().toString(36).substring(7))

  activeRequests.set(transferId, req)
  
  // Use a more robust way to track progress that doesn't interfere with multer
  const totalSize = parseInt(req.headers['content-length'] || '0')
  let receivedSize = 0
  let lastUpdateTime = 0
  const THROTTLE_MS = 200

  // We observe the data event but don't pause/resume the stream.
  // This is generally safe in modern Node.js even if multer is pipe()ing the stream.
  const onData = (chunk: Buffer) => {
    receivedSize += chunk.length
    const now = Date.now()
    if (totalSize > 0 && win && (receivedSize === chunk.length || now - lastUpdateTime > THROTTLE_MS)) {
      lastUpdateTime = now
      win.webContents.send('upload-progress', { 
        id: transferId, 
        progress: receivedSize / totalSize,
        processedBytes: receivedSize,
        totalBytes: totalSize,
        // Information about the file is added by multer later, 
        // but we can provide a generic label for now.
        currentFile: 'Receiving file...',
        currentIndex: 1,
        totalFiles: 1
      })
    }
  }

  req.on('data', onData)

  upload.single('file')(req, res, (err) => {
    // Cleanup the listener
    req.removeListener('data', onData)
    activeRequests.delete(transferId)
    
    if (err) {
      console.error(`Upload error for ${transferId}:`, err)
      if (win) win.webContents.send('upload-error', { id: transferId, error: err.message })
      return res.status(500).json({ error: err.message })
    }
    
    if (!req.file) {
      console.error(`Upload failed for ${transferId}: No file found in request`)
      if (win) win.webContents.send('upload-error', { id: transferId, error: 'No file received' })
      return res.status(400).json({ error: 'No file received' })
    }

    console.log(`Upload complete for ${transferId}: ${req.file.originalname}`)
    
    if (win) {
      win.webContents.send('upload-complete', {
        id: transferId,
        name: req.file.originalname,
        size: req.file.size,
        path: req.file.path,
        time: new Date().toLocaleTimeString(),
        progress: 1,
        processedBytes: req.file.size,
        totalBytes: req.file.size
      })
      // Unified event for easier state management
      win.webContents.send('transfer-complete', { deviceId: transferId })
    }
    res.json({ status: 'ok', message: 'Success' })
  })

  req.on('aborted', () => {
    req.removeListener('data', onData)
    activeRequests.delete(transferId)
    if (win) win.webContents.send('upload-error', { id: transferId, error: 'Upload aborted' })
  })
})

serverApp.post('/request-connect', (req, res) => {
  const { deviceId, name, platform, brand } = req.body
  console.log(`Connection request from ${name} (${deviceId})`)
  
  pendingConnections.set(deviceId, { res, name, deviceId, platform, brand, timestamp: Date.now() })
  win?.webContents.send('connection-request', { deviceId, name, platform, brand })
})

ipcMain.handle('get-upload-dir', () => uploadDir)

ipcMain.on('set-server-id', (_event, { id }) => {
  serverId = id
  saveConfig()
})

ipcMain.handle('get-nearby-nodes', () => {
  return Array.from(nearbyNodes.values())
})

ipcMain.handle('refresh-discovery', () => {
  nearbyNodes.clear()
  const localIp = getLocalIPs()[0]
  const message = JSON.stringify({
    type: 'discovery',
    id: serverId,
    name: serverName,
    ip: localIp,
    port: HTTP_PORT,
    platform: 'desktop',
    os: os.platform() === 'win32' ? 'Windows' : os.platform() === 'darwin' ? 'MacOS' : 'Linux'
  })
  udpSocket.send(message, 0, message.length, DISCOVERY_PORT, '255.255.255.255')
  win?.webContents.send('nearby-nodes-updated', [])
  return true
})

serverApp.get('/get-server-info', (_req, res) => {
  res.json({
    ip: getLocalIPs()[0],
    port: HTTP_PORT,
    name: serverName,
    hostname: os.hostname(),
    id: serverId,
    platform: 'desktop',
    os: os.platform() === 'win32' ? 'Windows' : os.platform() === 'darwin' ? 'MacOS' : 'Linux'
  })
})

serverApp.post('/respond-to-connection', (req, res) => {
  const { deviceId, accepted } = req.body
  console.log(`Connection response from ${deviceId}: ${accepted}`)
  
  const outgoing = outgoingRequests.get(deviceId)
  if (outgoing) {
    win?.webContents.send('pairing-response', { deviceId, accepted })
    outgoingRequests.delete(deviceId)
    return res.json({ status: 'ok' })
  }

  // Handle it as a response to an incoming request (legacy/direct)
  const pending = pendingConnections.get(deviceId)
  if (pending) {
    pending.res.json({ status: accepted ? 'accepted' : 'declined' })
    pendingConnections.delete(deviceId)
    return res.json({ status: 'ok' })
  }

  res.status(404).json({ error: 'Request not found' })
})

serverApp.get('/cancel-pairing/:deviceId', (req, res) => {
  const { deviceId } = req.params
  console.log(`Pairing cancelled by remote device: ${deviceId}`)
  
  const pending = pendingConnections.get(deviceId)
  if (pending) {
    win?.webContents.send('pairing-cancelled', { deviceId })
    try {
      pending.res.status(499).json({ status: 'cancelled' })
    } catch (e) {}
    pendingConnections.delete(deviceId)
  }
  
  res.json({ status: 'ok' })
})

serverApp.post('/announce', (req, res) => {
  const node = req.body
  if (node.id) {
    nearbyNodes.set(node.id, { ...node, lastSeen: Date.now() })
    win?.webContents.send('nearby-nodes-updated', Array.from(nearbyNodes.values()))
  }
  res.json({ status: 'ok' })
})

serverApp.get('/check-pairing-requests/:deviceId', (req, res) => {
  const { deviceId } = req.params
  
  // Check outgoing requests (initiated by this desktop to the device)
  const outgoing = outgoingRequests.get(deviceId)
  if (outgoing) {
    return res.json({
      status: 'pending',
      request: {
        name: serverName,
        id: serverId,
        os: os.platform() === 'win32' ? 'Windows' : os.platform() === 'darwin' ? 'MacOS' : 'Linux',
        ip: getLocalIPs()[0]
      }
    })
  }

  // Check incoming requests (initiated by the device to this desktop)
  const pending = pendingConnections.get(deviceId)
  if (pending) {
    return res.json({
      status: 'pending',
      request: {
        name: serverName,
        id: serverId,
        os: os.platform() === 'win32' ? 'Windows' : os.platform() === 'darwin' ? 'MacOS' : 'Linux',
        ip: getLocalIPs()[0]
      }
    })
  }

  res.json({ status: 'none' })
})

serverApp.get('/transfer-status/:deviceId', (req, res) => {
  const { deviceId } = req.params
  const download = pendingDownloads.get(deviceId)
  
  if (download) {
    const files = download.files.map((f, i) => ({
      name: f.name,
      size: f.size,
      type: f.type,
      index: i
    }))
    return res.json({ status: 'ready', files })
  }
  
  res.json({ status: 'none' })
})

serverApp.get('/download/:deviceId/:fileIndex', (req, res) => {
  const { deviceId, fileIndex } = req.params
  console.log(`Download request: device=${deviceId}, index=${fileIndex}`)
  
  const index = parseInt(fileIndex)
  const download = pendingDownloads.get(deviceId)
  
  if (!download || !download.files[index]) {
    console.error(`Download failed: No pending download for device ${deviceId} or index ${index}`)
    return res.status(404).send('File not found')
  }

  const file = download.files[index]
  const filePath = file.path
  const fileName = file.name
  
  if (!fs.existsSync(filePath)) {
    console.error(`Download failed: File missing on disk at ${filePath}`)
    return res.status(404).send('File missing on server')
  }

  const stats = fs.statSync(filePath)
  const fileSize = stats.size
  const totalBytes = download.files.reduce((acc, f) => acc + (f.size || 0), 0)
  
  // Calculate previously processed bytes (all files before this one)
  const previouslyProcessed = download.files.slice(0, index).reduce((acc, f) => acc + (f.size || 0), 0)

  // Set explicit headers
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Expose-Headers', 'Content-Length, Content-Disposition')
  res.setHeader('Content-Type', 'application/octet-stream')
  res.setHeader('Content-Length', fileSize)
  res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`)

  console.log(`Serving file: ${fileName} (${filePath})`)

  let fileProcessed = 0
  let lastUpdateTime = 0
  const THROTTLE_MS = 100

  const fileStream = fs.createReadStream(filePath)
  
  const progressTracker = new Transform({
    transform(chunk, _encoding, callback) {
      fileProcessed += chunk.length
      const currentOverallProcessed = previouslyProcessed + fileProcessed
      const now = Date.now()
      
      if (win && (now - lastUpdateTime > THROTTLE_MS || fileProcessed === fileSize)) {
        lastUpdateTime = now
        win.webContents.send('transfer-progress', {
          deviceId,
          progress: currentOverallProcessed / totalBytes, // Overall progress
          fileProgress: fileProcessed / fileSize,        // Per-file progress
          speed: 0, // Calculated in renderer
          currentFile: fileName,
          currentIndex: index + 1,
          totalFiles: download.files.length,
          processedBytes: currentOverallProcessed,
          totalBytes
        })
      }
      callback(null, chunk)
    }
  })

  fileStream.pipe(progressTracker).pipe(res)

  fileStream.on('error', (err) => {
    console.error(`Stream error for ${fileName}:`, err)
    if (!res.headersSent) res.status(500).send(err.message)
  })

  res.on('finish', () => {
    console.log(`Successfully finished serving ${fileName}`)
    if (index === download.files.length - 1) {
      if (win) win.webContents.send('transfer-complete', { deviceId })
      pendingDownloads.delete(deviceId)
    }
  })
})

serverApp.listen(HTTP_PORT, '0.0.0.0', () => {
  console.log(`ExLink Server running at http://0.0.0.0:${HTTP_PORT}`)
})

// --- IPC Handlers ---
ipcMain.handle('get-server-info', () => {
  // Freshly calculate ID in case IP changed
  serverId = getServerIdFromIp()
  return {
    ip: getLocalIPs()[0],
    port: HTTP_PORT,
    name: serverName,
    hostname: os.hostname(),
    id: serverId
  }
})

ipcMain.on('set-server-name', (_event, { name }) => {
  serverName = name
  saveConfig()
})

ipcMain.handle('initiate-pairing', async (_event, { deviceId, deviceIp }) => {
  const node = nearbyNodes.get(deviceId)
  const isMobile = node?.platform === 'mobile' || !node // Default to polling if unknown/mobile-like
  
  console.log(`Initiating pairing with ${deviceId} (${node?.platform || 'unknown'}) at ${deviceIp}`)
  
  // Notify UI immediately to show the "Waiting" overlay
  win?.webContents.send('pairing-initiated-ui', {
     deviceId,
     deviceIp,
     name: node?.name || 'Device',
     platform: node?.platform || 'mobile',
     brand: node?.brand,
     os: node?.os
  })

  if (isMobile) {
    // Mobile devices poll us
    outgoingRequests.set(deviceId, { deviceId, deviceIp, timestamp: Date.now() })
    return { status: 'waiting' }
  } else {
    // Desktop devices have servers, we can POST directly
    try {
      const controller = new AbortController()
      const timeout = setTimeout(() => controller.abort(), 2000)
      
      const res = await fetch(`http://${deviceIp}:${HTTP_PORT}/request-connect`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          deviceId: serverId,
          name: serverName,
          platform: 'desktop',
          os: os.platform() === 'win32' ? 'Windows' : os.platform() === 'darwin' ? 'MacOS' : 'Linux'
        }),
        signal: controller.signal
      })
      clearTimeout(timeout)
      
      if (res.ok) {
        const data: any = await res.json()
        if (data.status === 'accepted') {
           win?.webContents.send('pairing-response', { deviceId, accepted: true })
        } else if (data.status === 'declined') {
           win?.webContents.send('pairing-response', { deviceId, accepted: false })
        }
        return { status: 'sent' }
      }
    } catch (e) {
      console.error(`Failed to POST to desktop ${deviceId}:`, e)
      // Fallback: maybe it's actually acting like a mobile or firewall blocked us
      outgoingRequests.set(deviceId, { deviceId, deviceIp, timestamp: Date.now() })
      return { status: 'waiting' }
    }
  }
  return { status: 'error' }
})

ipcMain.handle('respond-to-connection', (_event, { deviceId, accepted }) => {
  const pending = pendingConnections.get(deviceId)
  if (pending) {
    pending.res.json({ status: accepted ? 'accepted' : 'declined' })
    pendingConnections.delete(deviceId)
    return true
  }

  // If we are canceling an outgoing request we initiated
  if (!accepted) {
    outgoingRequests.delete(deviceId)
    // Optionally notify the other side if they are polling
  }

  return false
})

ipcMain.handle('start-transfer', async (_event, { deviceId, deviceIp, platform, items }) => {
  console.log(`Starting transfer to ${deviceId} at ${deviceIp} with ${items.length} items`)
  
  const controller = new AbortController()
  activeTransfers.set(deviceId, { controller, files: items })
  
  // If target is mobile, we queue for download instead of pushing
  if (platform === 'mobile') {
     console.log(`Queueing files for mobile download: ${deviceId}`)
     pendingDownloads.set(deviceId, { files: items, timestamp: Date.now() })
     // Notify UI we are waiting/ready
     return
  }

  const totalBytes = items.reduce((acc: number, item: any) => acc + (item.size || 0), 0)
  let processedBytes = 0
  let startTime = Date.now()

  try {
    for (let i = 0; i < items.length; i++) {
      const item = items[i]
      if (item.type !== 'file') continue 

      const fileName = item.name
      const filePath = item.path
      const fileSize = item.size

      let fileProcessed = 0
      let fileLastUpdateTime = 0
      const THROTTLE_MS = 200

      const progressTracker = new Transform({
        transform(chunk: Buffer, _encoding: BufferEncoding, callback: (error?: Error | null, data?: any) => void) {
          fileProcessed += chunk.length
          const currentTotalProcessed = processedBytes + fileProcessed
          const progress = currentTotalProcessed / totalBytes
          const elapsed = (Date.now() - startTime) / 1000
          const speed = currentTotalProcessed / elapsed
          const now = Date.now()

          if (win && (now - fileLastUpdateTime > THROTTLE_MS || progress === 1)) {
            fileLastUpdateTime = now
            win.webContents.send('transfer-progress', {
              deviceId,
              progress,
              fileProgress: fileProcessed / fileSize,
              speed,
              currentFile: fileName,
              currentIndex: i + 1,
              totalFiles: items.length,
              processedBytes: currentTotalProcessed,
              totalBytes
            })
          }
          callback(null, chunk)
        }
      })

      const fileStream = fs.createReadStream(filePath).pipe(progressTracker)
      
      // We'll use a library-free boundary-based stream upload
      const boundary = '----ExLinkBoundary' + Math.random().toString(36).substring(2)
      const header = `--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="${fileName}"\r\nContent-Type: application/octet-stream\r\n\r\n`
      const footer = `\r\n--${boundary}--\r\n`
      
      const combinedStream = new PassThrough()
      combinedStream.write(Buffer.from(header))
      fileStream.pipe(combinedStream, { end: false })
      fileStream.on('end', () => {
        combinedStream.write(Buffer.from(footer))
        combinedStream.end()
      })

      const response = await fetch(`http://${deviceIp}:${HTTP_PORT}/upload`, {
        method: 'POST',
        headers: {
          'x-transfer-id': deviceId,
          'Content-Type': `multipart/form-data; boundary=${boundary}`
        },
        body: combinedStream as any,
        duplex: 'half',
        signal: controller.signal
      } as any)

      if (!response.ok) throw new Error(`Failed to upload ${fileName}`)
      
      processedBytes += fileSize
    }
    
    win?.webContents.send('transfer-complete', { deviceId })
    activeTransfers.delete(deviceId)
  } catch (e: any) {
    if (e.name === 'AbortError') {
      console.log('Transfer cancelled by user')
    } else {
      console.error('Transfer error:', e)
      win?.webContents.send('transfer-error', { deviceId, error: e.message })
    }
    activeTransfers.delete(deviceId)
  }
})

ipcMain.handle('cancel-transfer', (_event, { deviceId }) => {
  const transfer = activeTransfers.get(deviceId)
  if (transfer) {
    transfer.controller.abort()
    activeTransfers.delete(deviceId)
    return true
  }
  return false
})

ipcMain.handle('open-folder', () => shell.openPath(uploadDir))

ipcMain.handle('open-file', (_event, filePath) => {
  if (filePath && fs.existsSync(filePath)) shell.showItemInFolder(filePath)
})

ipcMain.handle('share-files', async () => {
  if (!win) return
  const { canceled, filePaths } = await dialog.showOpenDialog(win, { properties: ['openFile', 'multiSelections'] })
  if (canceled) return
  const sharedItems: { path: string, name: string, size: number }[] = []
  for (const filePath of filePaths) {
    const stats = fs.statSync(filePath)
    sharedItems.push({
      path: filePath,
      name: path.basename(filePath),
      size: stats.size
    })
  }
  return sharedItems
})

ipcMain.handle('share-folders', async () => {
  if (!win) return
  const { canceled, filePaths } = await dialog.showOpenDialog(win, { properties: ['openDirectory', 'multiSelections'] })
  if (canceled) return
  const sharedItems: { path: string, name: string, size: number }[] = []
  for (const filePath of filePaths) {
    sharedItems.push({
      path: filePath,
      name: path.basename(filePath),
      size: 0 // Folders don't have a simple size
    })
  }
  return sharedItems
})

ipcMain.on('window-minimize', () => win?.minimize())
ipcMain.on('window-maximize', () => {
  if (win?.isMaximized()) win.unmaximize()
  else win?.maximize()
})
ipcMain.on('window-close', () => win?.close())

function getLocalIPs() {
  const interfaces = os.networkInterfaces()
  const ips: string[] = []
  for (const name of Object.keys(interfaces)) {
    if (name.toLowerCase().includes('virtual') || name.toLowerCase().includes('docker')) continue
    const iface = interfaces[name]
    if (!iface) continue
    for (const addr of iface) {
      if (addr.family === 'IPv4' && !addr.internal) ips.push(addr.address)
    }
  }
  ips.sort((a, b) => {
    const score = (ip: string) => ip.startsWith('192.168.') ? 100 : (ip.startsWith('10.') ? 90 : 0)
    return score(b) - score(a)
  })
  return ips.length > 0 ? [ips[0]] : ['127.0.0.1']
}

function createWindow() {
  win = new BrowserWindow({
    icon: path.join(process.env.VITE_PUBLIC, 'electron-vite.svg'),
    frame: false,
    width: 1000,
    height: 700,
    minWidth: 800,
    minHeight: 600,
    webPreferences: {
      preload: path.join(__dirname, 'preload.mjs'),
      nodeIntegration: true,
      contextIsolation: true,
    },
  })

  if (VITE_DEV_SERVER_URL) {
    win.loadURL(VITE_DEV_SERVER_URL)
    win.webContents.openDevTools()
  } else {
    win.loadFile(path.join(RENDERER_DIST, 'index.html'))
  }
}

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
    win = null
  }
})

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow()
})

app.whenReady().then(createWindow)
