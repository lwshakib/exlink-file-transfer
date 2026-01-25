import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { StyleSheet, View, Platform, ScrollView, Image } from "react-native";
import { IconButton, Text, useTheme, Modal, Portal, Button, Card, ActivityIndicator, Divider } from "react-native-paper";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import Svg, { G, Path } from "react-native-svg";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import * as Network from "expo-network";
import { File, Directory, Paths } from "expo-file-system";
import * as FileSystemLegacy from "expo-file-system/legacy";
import * as MediaLibrary from "expo-media-library";
import { uniqueNamesGenerator, adjectives, animals } from "unique-names-generator";
import HistoryPortal from "@/components/HistoryPortal";
import { useFocusEffect } from "@react-navigation/native";
import { BottomSheetModal, BottomSheetView, BottomSheetScrollView, BottomSheetBackdrop } from "@gorhom/bottom-sheet";
import { useSettingsStore } from "@/store/useSettingsStore";

export default function ReceiveScreen() {
  const theme = useTheme();
  const router = useRouter();
  
  // Zustand Store
  const deviceName = useSettingsStore((state) => state.deviceName);
  const deviceId = useSettingsStore((state) => state.deviceId);
  const serverRunning = useSettingsStore((state) => state.serverRunning);
  const setDeviceName = useSettingsStore((state) => state.setDeviceName);
  const setDeviceId = useSettingsStore((state) => state.setDeviceId);
  const setServerRunning = useSettingsStore((state) => state.setServerRunning);
  
  const [pendingRequest, setPendingRequest] = useState<any>(null);
  const [discoveredDesktops, setDiscoveredDesktops] = useState<string[]>([]);
  
  // Transfer State
  const [transferStatus, setTransferStatus] = useState<'idle' | 'waiting-transfer' | 'downloading' | 'saving' | 'done' | 'error'>('idle');
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [currentFilename, setCurrentFilename] = useState("");
  const [transferStartTime, setTransferStartTime] = useState<number | null>(null);
  const [transferDuration, setTransferDuration] = useState(0);
  const [transferFiles, setTransferFiles] = useState<any[]>([]);
  const [totalTransferSize, setTotalTransferSize] = useState(0);
  const [downloadedBytes, setDownloadedBytes] = useState(0);
  const [currentSpeed, setCurrentSpeed] = useState(0);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [historyVisible, setHistoryVisible] = useState(false);
  
  // Bottom Sheet Ref
  const optionsSheetRef = useRef<BottomSheetModal>(null);
  const snapPoints = useMemo(() => ["50%", "85%"], []);

  const lastDownloadedRef = useRef(0);
  const prevBytesRef = useRef(0);
  const speedIntervalRef = useRef<any>(null);
  const currentDownloadRef = useRef<any | null>(null);

  const truncateFileName = (name: string, maxLength: number = 24) => {
    if (!name || name.length <= maxLength) return name;
    const dotIndex = name.lastIndexOf('.');
    let extension = '';
    let baseName = name;

    if (dotIndex !== -1 && name.length - dotIndex < 10) {
      extension = name.substring(dotIndex);
      baseName = name.substring(0, dotIndex);
    }

    const charsToKeep = maxLength - extension.length - 3;
    if (charsToKeep < 6) return name.substring(0, maxLength - 3) + '...';

    const startChars = Math.ceil(charsToKeep / 2);
    const endChars = Math.floor(charsToKeep / 2);

    return baseName.substring(0, startChars) + '...' + baseName.substring(baseName.length - endChars) + extension;
  };

  const formatFileSize = (bytes: number) => {
    if (!bytes || bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const isImage = (filename: string) => {
    const ext = filename.split('.').pop()?.toLowerCase();
    return ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp', 'heic'].includes(ext || '');
  };

  useEffect(() => {
    let interval: any;
    if (transferStatus === 'downloading') {
      if (!transferStartTime) setTransferStartTime(Date.now());
      interval = setInterval(() => {
        if (transferStartTime) {
          setTransferDuration(Math.floor((Date.now() - transferStartTime) / 1000));
        }
      }, 1000);

      // Speed calculation with smoothing
      prevBytesRef.current = 0;
      const speeds: number[] = [];
      speedIntervalRef.current = setInterval(() => {
        const current = lastDownloadedRef.current;
        const diff = current - prevBytesRef.current;
        const speed = Math.max(0, diff);
        
        speeds.push(speed);
        if (speeds.length > 3) speeds.shift();
        
        const avgSpeed = speeds.reduce((a, b) => a + b, 0) / speeds.length;
        setCurrentSpeed(avgSpeed);
        
        prevBytesRef.current = current;
      }, 1000);

    } else if (transferStatus === 'done' || transferStatus === 'error') {
      setCurrentSpeed(0);
      // Stop speed interval if still running
      if (speedIntervalRef.current) {
        clearInterval(speedIntervalRef.current);
        speedIntervalRef.current = null;
      }
    } else {
      setTransferStartTime(null);
      setTransferDuration(0);
      setCurrentSpeed(0);
      if (speedIntervalRef.current) {
        clearInterval(speedIntervalRef.current);
        speedIntervalRef.current = null;
      }
    }
    return () => {
      clearInterval(interval);
      if (speedIntervalRef.current) clearInterval(speedIntervalRef.current);
    };
  }, [transferStatus, transferStartTime]);

  const formatDuration = (seconds: number) => {
    const min = Math.floor(seconds / 60);
    const sec = seconds % 60;
    return `${min}:${sec.toString().padStart(2, '0')}`;
  };

  const loadIdentity = useCallback(async () => {
    // Generate name if missing
    if (!deviceName) {
      const name = uniqueNamesGenerator({
        dictionaries: [adjectives, animals],
        length: 2,
        separator: ' ',
        style: 'capital'
      });
      setDeviceName(name);
    }

    // Generate/Sync device ID
    const ip = await Network.getIpAddressAsync();
    if (ip && !ip.includes(':')) {
      const parts = ip.split('.');
      const lastOctet = parts[parts.length - 1];
      setDeviceId(lastOctet);
    } else if (!deviceId) {
      setDeviceId("000");
    }
  }, [deviceName, deviceId, setDeviceName, setDeviceId]);

  useEffect(() => {
    loadIdentity();
  }, []);

  useFocusEffect(
    React.useCallback(() => {
      // Refresh name/id when returning from Settings
      loadIdentity();
      return () => {};
    }, [loadIdentity])
  );

  useEffect(() => {
    const pollForRequests = async () => {
      if (!serverRunning) return;
      try {
        const myIp = await Network.getIpAddressAsync();
        if (!myIp || myIp.includes(':')) return;

        // Consistent pollId generation
        const pollId = deviceId || (myIp.includes('.') ? myIp.split('.').pop()! : "000");

        // If we have a pending request, check specifically if it still exists
        // But DON'T clear it if we are already transferring or finished
        if (pendingRequest && transferStatus === 'idle') {
          try {
            const res = await fetch(`http://${pendingRequest.desktopIp}:3030/check-pairing-requests/${pollId}`);
            if (res.ok) {
              const data = await res.json();
              if (data.status !== 'pending') {
                setPendingRequest(null);
                setTransferStatus('idle');
              }
            } else if (res.status === 404) {
              setPendingRequest(null);
              setTransferStatus('idle');
            }
          } catch (e) {
            setPendingRequest(null);
            setTransferStatus('idle');
          }
          return;
        }

        const subnet = myIp.substring(0, myIp.lastIndexOf('.') + 1);
        const currentDesktops = [...discoveredDesktops];
        
        // Scan subnet if we have few desktops or occasionally
        if (currentDesktops.length === 0 || Math.random() > 0.7) {
          const candidates = Array.from({ length: 254 }, (_, i) => i + 1);
          const batchSize = 50;
          for (let i = 0; i < candidates.length; i += batchSize) {
            const batch = candidates.slice(i, i + batchSize);
            await Promise.all(batch.map(async (suffix) => {
              const testIp = subnet + suffix;
              if (testIp === myIp) return;
              try {
                const controller = new AbortController();
                const timeout = setTimeout(() => controller.abort(), 400);
                const res = await fetch(`http://${testIp}:3030/get-server-info`, { signal: controller.signal });
                clearTimeout(timeout);
                if (res.ok) {
                  if (!currentDesktops.includes(testIp)) {
                    currentDesktops.push(testIp);
                  }
                }
              } catch (e) {}
            }));
          }
          setDiscoveredDesktops(currentDesktops);
        }

        // Search for new requests from known desktops in parallel
        await Promise.all(currentDesktops.map(async (desktopIp) => {
          if (pendingRequest) return;
          try {
            const controller = new AbortController();
            const timeout = setTimeout(() => controller.abort(), 1000);
            const res = await fetch(`http://${desktopIp}:3030/check-pairing-requests/${pollId}`, { 
              signal: controller.signal 
            });
            clearTimeout(timeout);
            
            if (res.ok) {
              const data = await res.json();
              if (data.status === 'pending' && !pendingRequest) {
                setPendingRequest({ ...data.request, desktopIp });
              }
            }
          } catch (e) {
            // Only remove if it's a hard failure and not just a timeout during busy network
            // (Optional: Implement a failure count if we want to be more robust)
          }
        }));
      } catch (e) {}
    };

    const interval = setInterval(pollForRequests, 1000);
    return () => clearInterval(interval);
  }, [discoveredDesktops, transferStatus, serverRunning, pendingRequest, deviceId]); 

  // Poll for Transfer Manifest (Receiver Flow)
  useEffect(() => {
    let polling = true;
    const checkTransferStatus = async () => {
      if (!serverRunning || transferStatus !== 'waiting-transfer' || !pendingRequest) return;
      
      try {
        const ip = await Network.getIpAddressAsync();
        const pollId = deviceId || (ip && ip.includes('.') ? ip.split('.').pop()! : '000');
        const res = await fetch(`http://${pendingRequest.desktopIp}:3030/transfer-status/${pollId}`);
        if (res.ok) {
           const data = await res.json();
           if (data.status === 'ready') {
             polling = false;
             setTransferStatus('downloading');
             downloadFiles(data.files, pendingRequest.desktopIp, pollId);
           } else if (data.status === 'none') {
             setPendingRequest(null);
             setTransferStatus('idle');
             polling = false;
           }
        }
      } catch (e) {}
      
      if (polling && transferStatus === 'waiting-transfer') setTimeout(checkTransferStatus, 1000);
    };

    if (transferStatus === 'waiting-transfer') {
      checkTransferStatus();
    }
    return () => { polling = false; };
  }, [transferStatus, pendingRequest, serverRunning]);

  const downloadFiles = async (files: any[], desktopIp: string, myId: string | null) => {
    const total = files.reduce((acc, f) => acc + f.size, 0);
    setTotalTransferSize(total);
    setDownloadedBytes(0);
    lastDownloadedRef.current = 0;
    setTransferFiles(files.map(f => ({ ...f, progress: 0, status: 'waiting' })));

    // Load settings from Zustand store
    const { saveToFolderPath, saveMediaToGallery } = useSettingsStore.getState();
    const shouldSaveToGallery = saveMediaToGallery;
    const isSAF = saveToFolderPath && saveToFolderPath.startsWith('content://');
    
    const isMediaFile = (name: string) => {
      const ext = name.toLowerCase().split('.').pop();
      return ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp', 'mp4', 'mov', 'avi', 'mkv', 'mp3', 'wav', 'm4a'].includes(ext || '');
    };

    let aggregateDownloaded = 0;
    const destDir = saveToFolderPath || Paths.document.uri;
    let completedFiles = 0;
    let failedFiles = 0;

    // Ensure destination directory exists if it's a local path (non-SAF)
    if (!isSAF) {
      try {
        const dir = new Directory(destDir);
        if (!dir.exists) {
          await dir.create();
          console.log("[Receive] Created destination folder:", destDir);
        }
      } catch (e) {
        console.warn("[Receive] Failed to ensure destDir exists, might fail download:", e);
      }
    }

    // Download files directly to destination (or cache for SAF)
    for (const file of files) {
      if (transferStatus === 'error' || !pendingRequest) break;
      setCurrentFilename(file.name);
      setTransferFiles(prev => prev.map(f => f.index === file.index ? { ...f, status: 'downloading' } : f));
      
      try {
        const url = `http://${desktopIp}:3030/download/${myId}/${file.index}`;
        
        // Determine download destination - always download directly to final location
        // For SAF, Android requires cache first, but we'll move it immediately after
        const destDir = saveToFolderPath || Paths.document.uri;
        let downloadUri: string;
        
        if (isSAF) {
          // For SAF, we must use cache temporarily (Android limitation)
          // But we'll move it to SAF immediately after download completes
          downloadUri = (FileSystemLegacy.cacheDirectory || '') + file.name;
        } else {
          // Download directly to final destination (no temporary location)
          downloadUri = destDir + (destDir.endsWith('/') ? '' : '/') + file.name;
        }

        const resumable = FileSystemLegacy.createDownloadResumable(
          url,
          downloadUri,
          {},
          (downloadProgress) => {
            const currentFileDownloaded = downloadProgress.totalBytesWritten;
            const totalDownloadedSoFar = aggregateDownloaded + currentFileDownloaded;
            lastDownloadedRef.current = totalDownloadedSoFar;
            setDownloadedBytes(totalDownloadedSoFar);
            setDownloadProgress(totalDownloadedSoFar / total);
            setTransferFiles(prev => prev.map(f => f.index === file.index ? { ...f, progress: currentFileDownloaded / file.size } : f));
          }
        );

        currentDownloadRef.current = resumable;
        const downloadRes = await resumable.downloadAsync();
        currentDownloadRef.current = null;
        
        if (downloadRes && (downloadRes.status === 200 || downloadRes.status === 201)) {
          let finalUri = downloadRes.uri;
          let fileSavedSuccessfully = false;
          
          // For SAF destinations, always try to save to the selected SAF folder
          // We'll attempt it for all files, but handle OOM errors gracefully for large files
          if (isSAF) {
            const mimeType = getMimeType(file.name);
            let safFileUri: string | null = null;
            
            try {
              // Create SAF file first
              safFileUri = await FileSystemLegacy.StorageAccessFramework.createFileAsync(
                saveToFolderPath!,
                file.name,
                mimeType
              );
              
              // Try to read and write file to SAF
              // For large files, this might cause OOM, but we'll catch it
              const base64Content = await FileSystemLegacy.readAsStringAsync(downloadRes.uri, {
                encoding: FileSystemLegacy.EncodingType.Base64,
              });
              
              await FileSystemLegacy.StorageAccessFramework.writeAsStringAsync(
                safFileUri,
                base64Content,
                { encoding: FileSystemLegacy.EncodingType.Base64 }
              );
              
              // Successfully saved to SAF folder - delete cache immediately
              await FileSystemLegacy.deleteAsync(downloadRes.uri, { idempotent: true });
              finalUri = safFileUri;
              fileSavedSuccessfully = true;
              console.log(`File ${file.name} (${formatFileSize(file.size)}) saved directly to SAF folder`);
            } catch (safErr: any) {
              // SAF failed - could be OOM for large files or other error
              const isOOM = safErr.message?.includes('OutOfMemoryError') || 
                           safErr.message?.includes('OutOfMemory') ||
                           safErr.toString().includes('OutOfMemory');
              
              if (isOOM) {
                console.warn(`Large file ${file.name} (${formatFileSize(file.size)}) - OOM when saving to SAF, using alternative method`);
              } else {
                console.warn(`SAF save failed for ${file.name}:`, safErr.message || safErr);
              }
              
              // Clean up SAF file if it was created but not written
              if (safFileUri) {
                try {
                  await FileSystemLegacy.deleteAsync(safFileUri, { idempotent: true });
                } catch (cleanupErr) {
                  // Ignore cleanup errors
                }
              }
              
              // For large files that cause OOM, try to save to the selected folder using File API
              // If that fails, save to internal storage as fallback
              try {
                // First, try to use File.move() to move the file to SAF folder if possible
                // This avoids Base64 encoding and OOM
                let movedToSAF = false;
                
                try {
                  // Try to get the SAF folder path and move file there using File API
                  // Note: This might not work for SAF, but worth trying
                  const tempFile = new File(downloadRes.uri);
                  
                  // For SAF, we can't directly move, so we'll save to internal storage
                  // but at least ensure the file is saved successfully
                  const destPath = Paths.document.uri + '/' + file.name;
                  
                  // Check if file already exists and delete it
                  try {
                    const exists = await FileSystemLegacy.getInfoAsync(destPath);
                    if (exists.exists) {
                      await FileSystemLegacy.deleteAsync(destPath, { idempotent: true });
                    }
                  } catch (checkErr) {
                    // File doesn't exist, continue
                  }
                  
                  // Copy from cache to internal storage (direct save, no temp location)
                  await FileSystemLegacy.copyAsync({
                    from: downloadRes.uri,
                    to: destPath,
                  });
                  
                  // Verify the file was copied successfully
                  const verifyExists = await FileSystemLegacy.getInfoAsync(destPath);
                  if (!verifyExists.exists) {
                    throw new Error('File copy verification failed');
                  }
                  
                  // Immediately delete temporary cache file
                  await FileSystemLegacy.deleteAsync(downloadRes.uri, { idempotent: true });
                  finalUri = destPath;
                  fileSavedSuccessfully = true;
                  
                  if (isOOM) {
                    console.log(`Large file ${file.name} (${formatFileSize(file.size)}) saved to internal storage - SAF requires Base64 encoding which causes OOM for files this large`);
                  } else {
                    console.log(`File ${file.name} saved to internal storage (SAF failed)`);
                  }
                } catch (moveErr) {
                  // If move fails, try copy as fallback
                  throw moveErr;
                }
              } catch (fallbackErr: any) {
                console.error('Fallback save failed:', fallbackErr);
                // Try one more time with a simpler approach
                try {
                  const destPath = Paths.document.uri + '/' + file.name;
                  await FileSystemLegacy.copyAsync({
                    from: downloadRes.uri,
                    to: destPath,
                  });
                  await FileSystemLegacy.deleteAsync(downloadRes.uri, { idempotent: true });
                  finalUri = destPath;
                  console.log(`File ${file.name} saved to internal storage (fallback method)`);
                } catch (lastResortErr) {
                  console.error('All save methods failed:', lastResortErr);
                  // Keep file in cache as absolute last resort
                  finalUri = downloadRes.uri;
                  // Still mark as done so transfer completes
                  console.warn(`File ${file.name} kept in cache due to save failures`);
                }
              }
            }
          } else {
            // For non-SAF, file is already in final location - just ensure it's there
            finalUri = downloadRes.uri;
            fileSavedSuccessfully = true;
            console.log(`File ${file.name} saved directly to selected location`);
          }
          
          // Ensure file is marked as saved (download was successful)
          if (!fileSavedSuccessfully) {
            fileSavedSuccessfully = true; // Download succeeded, file exists at finalUri
          }
          
          // Gallery saving for media files (use finalUri, not downloadRes.uri which may be deleted)
          if (shouldSaveToGallery && isMediaFile(file.name) && file.size < 50 * 1024 * 1024) {
            try {
              const { status } = await MediaLibrary.requestPermissionsAsync();
              if (status === 'granted') {
                // Use finalUri which points to the actual saved file location
                await MediaLibrary.createAssetAsync(finalUri);
              }
            } catch (e) {
              console.warn('Failed to save media to gallery:', e);
            }
          }

          // Force a system-wide media scan for Android public folders
          if (Platform.OS === 'android' && finalUri && !finalUri.startsWith('content://')) {
            try { await MediaLibrary.saveToLibraryAsync(finalUri); } catch (scanErr) {}
          }

          // History Persistence
          const { addHistoryItem } = useSettingsStore.getState();
          addHistoryItem({
            id: `${Date.now()}-${file.name}`,
            name: file.name,
            size: file.size,
            timestamp: Date.now(),
            from: pendingRequest?.name || 'Unknown Device'
          });

          aggregateDownloaded += file.size;
          completedFiles++;
          lastDownloadedRef.current = aggregateDownloaded; 
          setDownloadedBytes(aggregateDownloaded); 
          setDownloadProgress(Math.min(aggregateDownloaded / total, 1)); 
          setTransferFiles(prev => prev.map(f => f.index === file.index ? { ...f, status: 'done', progress: 1, localUri: finalUri } : f));
        } else {
           throw new Error(`Download failed with status ${downloadRes?.status}`);
        }
      } catch (e: any) {
        currentDownloadRef.current = null;
        if (e.message?.includes('cancel') || e.message?.includes('abort')) {
            console.log('Download cancelled');
            return;
        } else {
            console.error('Download error:', e);
            failedFiles++;
            setTransferFiles(prev => prev.map(f => f.index === file.index ? { ...f, status: 'error' } : f));
        }
      }
    }
    
    // Stop speed calculation immediately
    if (speedIntervalRef.current) {
      clearInterval(speedIntervalRef.current);
      speedIntervalRef.current = null;
    }
    setCurrentSpeed(0);
    prevBytesRef.current = 0;
    
    // Check if all files are processed
    const totalProcessed = completedFiles + failedFiles;
    const allDone = completedFiles === files.length;
    const hasErrors = failedFiles > 0;
    
    console.log(`[Receive] Transfer status: ${completedFiles} completed, ${failedFiles} failed, ${totalProcessed}/${files.length} total processed`);
    
    // Ensure progress is exactly 1.0 when all files are done
    if (allDone) {
      // Update all state synchronously to ensure UI updates immediately
      setDownloadProgress(1);
      setDownloadedBytes(total);
      lastDownloadedRef.current = total;
      setTransferStatus('done');
      setCurrentFilename(''); // Clear current filename
      setCurrentSpeed(0); // Ensure speed is 0
      console.log('[Receive] ✅ All files downloaded successfully - transfer complete');
    } else if (hasErrors && totalProcessed === files.length) {
      // All files processed but some had errors
      setDownloadProgress(Math.min(aggregateDownloaded / total, 1));
      setTransferStatus('error');
      setCurrentFilename(''); // Clear current filename
      setCurrentSpeed(0);
      console.log('[Receive] ⚠️ Transfer completed with errors');
    } else if (totalProcessed === files.length) {
      // All files processed (fallback - should mark as done if we processed all)
      setDownloadProgress(1);
      setDownloadedBytes(total);
      lastDownloadedRef.current = total;
      setTransferStatus('done');
      setCurrentFilename(''); // Clear current filename
      setCurrentSpeed(0);
      console.log('[Receive] ✅ All files processed - marking as done');
    } else {
      // Not all files processed (shouldn't happen, but handle it)
      console.warn(`[Receive] ⚠️ Transfer incomplete: ${totalProcessed}/${files.length} files processed`);
      // Still mark as done if we processed most files (might be a counting issue)
      if (totalProcessed >= files.length * 0.9) {
        setDownloadProgress(1);
        setDownloadedBytes(total);
        setTransferStatus('done');
        setCurrentSpeed(0);
        console.log('[Receive] ✅ Marking as done (processed most files)');
      } else {
        setTransferStatus('error');
        setCurrentSpeed(0);
      }
      setCurrentFilename(''); // Clear current filename
    }
  };

  const getMimeType = (filename: string) => {
    const ext = filename.split('.').pop()?.toLowerCase();
    const mimeMap: { [key: string]: string } = {
      'jpg': 'image/jpeg',
      'jpeg': 'image/jpeg',
      'png': 'image/png',
      'gif': 'image/gif',
      'webp': 'image/webp',
      'mp4': 'video/mp4',
      'mov': 'video/quicktime',
      'pdf': 'application/pdf',
      'txt': 'text/plain',
      'zip': 'application/zip',
      'apk': 'application/vnd.android.package-archive',
      'exe': 'application/x-msdownload',
      'msi': 'application/x-msdownload',
      'dmg': 'application/x-apple-diskimage',
      'pkg': 'application/x-newton-compatible-pkg',
      'deb': 'application/x-debian-package',
      'rpm': 'application/x-rpm',
      'bin': 'application/octet-stream',
      'app': 'application/octet-stream',
    };
    return mimeMap[ext || ''] || 'application/octet-stream';
  };

  const respondToRequest = async (accepted: boolean) => {
    if (!pendingRequest) return;
    
    if (!accepted) {
      // If we are currently downloading, cancel it
      if (transferStatus === 'downloading' && currentDownloadRef.current) {
        try {
          // resumable objects from createDownloadResumable have cancelAsync or pauseAsync
          if ((currentDownloadRef.current as any).cancelAsync) {
            await (currentDownloadRef.current as any).cancelAsync();
          } else if ((currentDownloadRef.current as any).pauseAsync) {
            await (currentDownloadRef.current as any).pauseAsync();
          }
        } catch (e) {}
        currentDownloadRef.current = null;
      }

      // Decline/Cancel logic
      try {
        const myIp = await Network.getIpAddressAsync();
        const pollId = deviceId || (myIp.includes('.') ? myIp.split('.').pop() : myIp);
        
        if (transferStatus === 'idle' || transferStatus === 'waiting-transfer') {
            await fetch(`http://${pendingRequest.desktopIp}:3030/respond-to-connection`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ deviceId: pollId, accepted: false })
            });
        } else {
            // Already transferring, call cancel-transfer
            await fetch(`http://${pendingRequest.desktopIp}:3030/cancel-transfer/${pollId}`);
        }
      } catch (e) {}
      
      setPendingRequest(null);
      setTransferStatus('idle');
      return;
    }

    // Accept Logic
    try {
      const myIp = await Network.getIpAddressAsync();
      const pollId = deviceId || (myIp.includes('.') ? myIp.split('.').pop() : myIp);
      const res = await fetch(`http://${pendingRequest.desktopIp}:3030/respond-to-connection`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ deviceId: pollId, accepted: true })
      });
      
      if (res.ok) {
        setTransferStatus('waiting-transfer');
        setIsMinimized(false);
      } else {
        setPendingRequest(null); // Failed to respond
      }
    } catch (e) {
      setPendingRequest(null);
    }
  };

  const closeTransfer = () => {
     setPendingRequest(null);
     setTransferStatus('idle');
     setDownloadProgress(0);
     setTransferFiles([]);
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      {/* Top Header Icons */}
      <View style={styles.header}>
        <View style={{ flexDirection: 'row' }}>
          <IconButton
            icon="history"
            size={24}
            onPress={() => setHistoryVisible(true)}
          />
          <IconButton
            icon="refresh"
            size={24}
            onPress={() => {
              // Trigger a subset of polling immediately
              // (The useEffect will pick up discoveredDesktops and poll at its next tick, 
              // but we can also manually trigger discovery update)
              setDiscoveredDesktops([]); // Force a re-scan
            }}
          />
        </View>
        <IconButton icon="information-outline" size={24} onPress={() => {}} />
      </View>

      <View style={styles.content}>
        {/* Central Animation Placeholder */}
        <View style={styles.centerSection}>
          <View style={styles.outerCircle}>
            {/* SVG Logo from user */}
            <Svg width="200" height="200" viewBox="0 0 48 48" fill="none">
              <G translate="3 0" fill={theme.colors.primary}>
                <Path d="m14.1061 19.6565c5.499-2.6299 9.8025-7.0929 12.2731-12.67168-1.5939-1.67362-3.666-2.86907-5.8975-3.58634l-1.1954-.39848c-.0797.15939-.1594.39849-.1594.55788-1.9127 5.41936-5.8178 9.80262-11.07766 12.27322-3.66599 1.7533-6.37564 4.9412-7.650763 8.7666l-.398477 1.1955c.159391.0797.39848.1593.557871.1593 1.514209.5579 3.028419 1.2752 4.462939 2.1519 1.99238-3.5864 5.18019-6.6148 9.08529-8.4479z"/>
                <Path d="m37.2173 19.9753c-2.9487 4.463-7.0132 8.0494-12.034 10.4403-4.0645 1.9127-7.1726 5.499-8.6071 9.8026l-.3985 1.3549c1.5142 1.3548 3.3472 2.3909 5.3396 3.0284l1.1955.3985c.0796-.1594.1593-.3985.1593-.5579 1.9127-5.4193 5.8178-9.8026 11.0777-12.2732 3.666-1.7533 6.4553-4.9412 7.6507-8.7666l.3985-1.1954c-1.6736-.4782-3.2675-1.2752-4.7817-2.2316z" opacity=".5"/>
                <Path d="m12.9903 37.4284c1.9924-4.7818 5.6584-8.6869 10.3604-10.9184 4.3035-2.0721 7.8898-5.26 10.3604-9.1651-1.833-1.7533-3.3472-3.7458-4.463-6.1366-2.9487 5.4193-7.571 9.8026-13.2294 12.5123-3.2675 1.5142-5.8974 4.1442-7.49136 7.3321 1.75326 1.6736 3.18786 3.7457 4.30356 6.0569 0 0 .0797.1594.1594.3188z" opacity=".7"/>
              </G>
            </Svg>

          </View>

          <Text variant="headlineLarge" style={[styles.deviceName, { color: theme.colors.onBackground }]}>
            {deviceName || "..."}
          </Text>
          <Text variant="titleMedium" style={[styles.deviceId, { color: theme.colors.onSurfaceVariant }]}>
            #{deviceId}
          </Text>
        </View>

        {/*
          Quick Save Section (disabled for now)
          <View style={styles.bottomSection}>
            <Text variant="labelLarge" style={[styles.quickSaveLabel, { color: theme.colors.onSurfaceVariant }]}>
              Quick Save
            </Text>
            <SegmentedButtons
              value={quickSave}
              onValueChange={setQuickSave}
              buttons={[
                { value: "off", label: "Off" },
                { value: "favorites", label: "Favorites" },
                { value: "on", label: "On" },
              ]}
              style={styles.segmentedButtons}
            />
          </View>
        */}

        {isMinimized && pendingRequest && (
          <Card style={[styles.minimizedBanner, { backgroundColor: theme.colors.elevation.level2 }]} onPress={() => setIsMinimized(false)}>
            <Card.Content style={styles.minimizedContent}>
              <View style={styles.minimizedIcon}>
                <ActivityIndicator size={20} color={theme.colors.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text variant="labelLarge">{transferStatus === 'done' ? 'Transfer Finished' : 'Receiving files...'}</Text>
                <Text variant="bodySmall" style={{ opacity: 0.7 }}>{currentFilename}</Text>
              </View>
              <IconButton icon="open-in-new" size={20} onPress={() => setIsMinimized(false)} />
            </Card.Content>
          </Card>
        )}
      </View>

      <Portal>
        <Modal
          visible={!!pendingRequest && !isMinimized}
          onDismiss={() => { 
            if (transferStatus === 'idle') respondToRequest(false);
            else if (transferStatus === 'done' || transferStatus === 'error') closeTransfer();
            else setIsMinimized(true);
          }}
          contentContainerStyle={[styles.modalContainer, { backgroundColor: theme.colors.background }]}
          dismissable={transferStatus === 'idle' || transferStatus === 'done' || transferStatus === 'error'}
        >
          <SafeAreaView style={{ flex: 1 }} edges={['bottom', 'left', 'right']}>
            <View style={styles.modalContent}>
              
              {transferStatus === 'idle' && (
                <>
                  <View style={styles.modalBody}>
                    <View style={[styles.iconCircle, { backgroundColor: theme.colors.surfaceVariant, borderColor: theme.colors.outlineVariant }]}>
                      <MaterialCommunityIcons 
                        name={pendingRequest?.platform === 'mobile' ? 'cellphone' : 'laptop'} 
                        size={64} 
                        color={theme.colors.primary} 
                      />
                    </View>
                    
                    <Text variant="headlineLarge" style={[styles.pairingName, { color: theme.colors.onBackground }]}>
                      {pendingRequest?.name}
                    </Text>

                    <View style={styles.badgeRowExtended}>
                      <View style={[styles.idBadge, { backgroundColor: theme.colors.surfaceVariant, borderColor: theme.colors.outlineVariant }]}>
                        <Text style={[styles.idBadgeText, { color: theme.colors.onSurfaceVariant }]}>
                          #{pendingRequest?.id?.slice(-3)}
                        </Text>
                      </View>
                      <View style={[styles.osBadge, { backgroundColor: theme.colors.surfaceVariant, borderColor: theme.colors.outlineVariant }]}>
                        <Text style={[styles.osBadgeText, { color: theme.colors.onSurfaceVariant }]}>
                          {pendingRequest?.os || 'System'}
                        </Text>
                      </View>
                    </View>

                    <Text style={[styles.wantsToSend, { color: theme.colors.onSurfaceVariant }]}>
                      wants to send you a file
                    </Text>
                  </View>

                  <View style={styles.modalFooter}>
                    <Button
                      mode="contained-tonal"
                      onPress={() => optionsSheetRef.current?.present()}
                      icon="format-list-bulleted"
                      textColor={theme.colors.primary}
                      style={styles.optionsButtonCompact}
                      labelStyle={{ fontSize: 13, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 }}
                      contentStyle={{ height: 40 }}
                    >
                      View Files
                    </Button>

                    <View style={styles.footerActionRow}>
                      <View style={styles.actionButtonWrapper}>
                        <Button
                          mode="contained-tonal"
                          onPress={() => respondToRequest(false)}
                          style={[styles.compactPillButton, { backgroundColor: theme.colors.errorContainer }]}
                          textColor={theme.colors.onErrorContainer}
                          contentStyle={styles.compactButtonContent}
                          labelStyle={styles.compactButtonLabel}
                        >
                          Decline
                        </Button>
                      </View>
                      <View style={styles.actionButtonWrapper}>
                        <Button
                          mode="contained"
                          onPress={() => respondToRequest(true)}
                          style={styles.compactPillButton}
                          buttonColor={theme.colors.primary}
                          textColor={theme.colors.onPrimary}
                          contentStyle={styles.compactButtonContent}
                          labelStyle={styles.compactButtonLabel}
                        >
                          Accept
                        </Button>
                      </View>
                    </View>
                  </View>
                </>
              )}

              {(transferStatus !== 'idle' && transferStatus !== 'error' && !pendingRequest?.name) && transferStatus !== 'done' && (
                 <View style={styles.modalBody}>
                    <ActivityIndicator size="large" color={theme.colors.primary} />
                    <Text variant="headlineSmall" style={{ marginTop: 24, color: theme.colors.onSurface }}>Preparing transfer...</Text>
                 </View>
              )}

              {transferStatus !== 'idle' && (transferStatus === 'waiting-transfer' || transferStatus === 'downloading' || transferStatus === 'saving' || transferStatus === 'done' || transferStatus === 'error') && pendingRequest && (
                 <View style={[styles.transferContent, { backgroundColor: theme.colors.surface, flex: 1 }]}>
                    <View style={styles.modalHeaderList}>
                        {transferStatus === 'done' ? (
                          <View style={{ alignItems: 'center', paddingVertical: 10, gap: 8 }}>
                            <View style={[styles.doneCircle, { backgroundColor: theme.colors.primaryContainer, width: 64, height: 64, borderRadius: 32 }]}>
                              <MaterialCommunityIcons name="check" size={40} color={theme.colors.primary} />
                            </View>
                            <Text style={[styles.modalHeaderTitle, { color: theme.colors.onSurface, fontWeight: '800', fontSize: 24 }]}>
                               Received successfully
                            </Text>
                            <Text style={[styles.saveToText, { color: theme.colors.onSurfaceVariant }]}>
                               from {pendingRequest?.name || 'Unknown Device'}
                            </Text>
                          </View>
                        ) : (
                          <>
                            <Text style={[styles.modalHeaderTitle, { color: theme.colors.onSurface }]}>
                               {transferStatus === 'saving' ? 'Saving files...' : (transferStatus === 'error' ? 'Transfer Failed' : 'Receiving files')}
                            </Text>
                            <Text style={[styles.saveToText, { color: theme.colors.secondary }]}>
                               from {pendingRequest?.name || 'Unknown Device'}
                            </Text>
                          </>
                        )}
                    </View>

                    <ScrollView style={styles.modalItemList}>
                       {transferFiles.length > 0 ? transferFiles.map((file, idx) => (
                         <View key={idx} style={styles.modalFileRow}>
                            <View style={[styles.modalFileIconContainer, { backgroundColor: theme.colors.surfaceVariant, borderColor: theme.colors.outlineVariant }]}>
                               {isImage(file.name) && file.status === 'done' && file.localUri ? (
                                 <Image source={{ uri: file.localUri }} style={{ width: '100%', height: '100%', borderRadius: 4 }} />
                               ) : (
                                 <MaterialCommunityIcons 
                                   name={isImage(file.name) ? "image-outline" : "file-outline"} 
                                   size={24} 
                                   color={theme.colors.onSurfaceVariant} 
                                   opacity={0.8} 
                                 />
                               )}
                            </View>
                            <View style={styles.modalFileDetails}>
                               <View style={styles.fileNameRow}>
                                  <Text style={[styles.modalFileName, { color: theme.colors.onSurface }]}>
                                    {truncateFileName(file.name)}
                                  </Text>
                                  <Text style={[styles.fileSizeText, { color: theme.colors.onSurfaceVariant }]}>
                                    {formatFileSize(file.size)}
                                  </Text>
                               </View>
                               {file.status === 'done' && (
                                 <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: -4 }}>
                                   <MaterialCommunityIcons name="check-circle" size={14} color={theme.colors.primary} />
                                   <Text style={{ color: theme.colors.primary, fontSize: 12 }}>Done</Text>
                                 </View>
                               )}
                               <View style={[styles.modalItemProgressBarContainer, { backgroundColor: theme.colors.surfaceVariant }]}>
                                  <View style={[styles.modalItemProgressBar, { backgroundColor: theme.colors.primary, width: `${(file.progress || 0) * 100}%` }]} />
                                </View>
                            </View>
                         </View>
                       )) : (
                         <View style={styles.modalFileRow}>
                            <View style={[styles.modalFileIconContainer, { backgroundColor: theme.colors.surfaceVariant, borderColor: theme.colors.outlineVariant }]}>
                               <MaterialCommunityIcons name="file-outline" size={24} color={theme.colors.onSurfaceVariant} opacity={0.8} />
                            </View>
                            <View style={styles.modalFileDetails}>
                               <Text style={[styles.modalFileName, { color: theme.colors.onSurface }]}>
                                 {currentFilename || 'Incoming File'} (...)
                               </Text>
                               <View style={[styles.modalItemProgressBarContainer, { backgroundColor: theme.colors.surfaceVariant }]}>
                                  <View style={[styles.modalItemProgressBar, { backgroundColor: theme.colors.primary, width: `${downloadProgress * 100}%` }]} />
                               </View>
                            </View>
                         </View>
                       )}
                    </ScrollView>

                    <View style={styles.modalFooterList}>
                       <View style={styles.modalTotalProgressSection}>
                          <Text style={[styles.modalTotalProgressLabel, { color: theme.colors.onSurface }]}>
                             {transferStatus === 'done' ? 'Finished' : `Total progress (${formatDuration(transferDuration)})`}
                          </Text>
                          <View style={[styles.modalTotalProgressBarContainer, { backgroundColor: theme.colors.surfaceVariant }]}>
                             <View style={[styles.modalTotalProgressBar, { backgroundColor: theme.colors.primary, width: `${downloadProgress * 100}%` }]} />
                          </View>
                       </View>

                       {showAdvanced && (
                         <View style={styles.advancedStats}>
                           <Text style={[styles.advancedStatText, { color: theme.colors.onSurfaceVariant }]}>
                             Files: {transferFiles.filter(f => f.status === 'done').length} / {transferFiles.length}
                           </Text>
                           <Text style={[styles.advancedStatText, { color: theme.colors.onSurfaceVariant }]}>
                             Size: {formatFileSize(downloadedBytes)} / {formatFileSize(totalTransferSize)}
                           </Text>
                           <Text style={[styles.advancedStatText, { color: theme.colors.onSurfaceVariant }]}>
                             Speed: {formatFileSize(currentSpeed)}/s
                           </Text>
                         </View>
                       )}

                       <View style={[styles.modalActionRow, transferStatus === 'done' && { justifyContent: 'center' }]}>
                          {transferStatus !== 'done' && (
                            <Button 
                              mode="text" 
                              onPress={() => setShowAdvanced(!showAdvanced)} 
                              textColor={theme.colors.primary} 
                              labelStyle={styles.actionButtonLabel}
                              icon={showAdvanced ? 'eye-off' : () => (
                                <View style={[styles.advancedIcon, { borderColor: theme.colors.outline }]}>
                                   <Text style={[styles.advancedIconText, { color: theme.colors.primary }]}>i</Text>
                                </View>
                              )}
                            >
                              {showAdvanced ? 'Hide' : 'Advanced'}
                            </Button>
                          )}

                          <Button 
                            mode={transferStatus === 'done' ? "contained" : "text"} 
                            onPress={() => {
                               if (transferStatus === 'done' || transferStatus === 'error') {
                                 closeTransfer();
                               } else {
                                 respondToRequest(false);
                               }
                            }} 
                            textColor={transferStatus === 'done' ? theme.colors.onPrimary : theme.colors.primary} 
                            buttonColor={transferStatus === 'done' ? theme.colors.primary : undefined}
                            labelStyle={[
                              styles.actionButtonLabel,
                              transferStatus === 'done' && { fontWeight: 'bold', paddingHorizontal: 24, fontSize: 16 }
                            ]}
                            style={[
                              transferStatus === 'done' ? styles.doneButton : { borderRadius: 28 }
                            ]}
                            contentStyle={transferStatus === 'done' ? { height: 50 } : {}}
                            icon={transferStatus === 'done' ? 'check-circle' : transferStatus === 'error' ? 'close-circle' : 'close'}
                          >
                            {transferStatus === 'done' ? 'Done' : transferStatus === 'error' ? 'Close' : 'Cancel'}
                          </Button>
                       </View>
                    </View>
                 </View>
              )}

            </View>
          </SafeAreaView>
        </Modal>
      </Portal>

      <HistoryPortal 
        visible={historyVisible} 
        onDismiss={() => setHistoryVisible(false)} 
      />

      <BottomSheetModal
        ref={optionsSheetRef}
        index={0}
        snapPoints={snapPoints}
        backdropComponent={(props) => (
          <BottomSheetBackdrop {...props} disappearsOnIndex={-1} appearsOnIndex={0} />
        )}
        backgroundStyle={{ backgroundColor: theme.colors.surface }}
        handleIndicatorStyle={{ backgroundColor: theme.colors.onSurfaceVariant }}
      >
        <BottomSheetView style={{ flex: 1, paddingBottom: 16 }}>
          <View style={{ paddingHorizontal: 24, paddingTop: 8, paddingBottom: 16 }}>
            <Text variant="titleLarge" style={{ fontWeight: '800', letterSpacing: -0.5 }}>Incoming Files</Text>
            <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, marginTop: 2 }}>
              {pendingRequest?.files?.length || 0} items • {formatFileSize(pendingRequest?.files?.reduce((acc: number, f: any) => acc + (f.size || 0), 0) || 0)}
            </Text>
          </View>
          <BottomSheetScrollView 
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: 16 }}
          >
            {pendingRequest?.files?.map((file: any, index: number) => (
              <Card 
                key={index} 
                style={{ marginBottom: 8, borderRadius: 16, backgroundColor: 'transparent' }} 
                mode="contained"
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', padding: 12 }}>
                  <View style={{ 
                    width: 44, 
                    height: 44, 
                    borderRadius: 12, 
                    backgroundColor: theme.colors.surfaceVariant, 
                    alignItems: 'center', 
                    justifyContent: 'center',
                    marginRight: 16,
                    borderWidth: 1,
                    borderColor: theme.colors.outlineVariant
                  }}>
                    <MaterialCommunityIcons 
                      name={isImage(file.name) ? "image-outline" : "file-outline"} 
                      size={24} 
                      color={theme.colors.primary} 
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text 
                      variant="bodyLarge" 
                      style={{ fontWeight: '700', color: theme.colors.onSurface }}
                    >
                      {truncateFileName(file.name, 40) || "Unknown File"}
                    </Text>
                    <Text variant="labelMedium" style={{ color: theme.colors.onSurfaceVariant }}>
                      {formatFileSize(file.size)}
                    </Text>
                  </View>
                </View>
                {index < pendingRequest.files.length - 1 && <Divider style={{ marginHorizontal: 12, opacity: 0.5 }} />}
              </Card>
            ))}
            {(!pendingRequest?.files || pendingRequest.files.length === 0) && (
              <View style={{ padding: 60, alignItems: 'center' }}>
                <View style={{ 
                  width: 80, 
                  height: 80, 
                  borderRadius: 40, 
                  backgroundColor: theme.colors.surfaceVariant,
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: 16
                }}>
                  <MaterialCommunityIcons name="file-question-outline" size={48} color={theme.colors.onSurfaceDisabled} />
                </View>
                <Text variant="bodyLarge" style={{ color: theme.colors.onSurfaceVariant, fontWeight: '500' }}>No file details available</Text>
              </View>
            )}
          </BottomSheetScrollView>
          <View style={{ paddingHorizontal: 24, paddingVertical: 16 }}>
            <Button 
              mode="contained" 
              onPress={() => optionsSheetRef.current?.dismiss()}
              style={{ borderRadius: 28 }}
              contentStyle={{ height: 50 }}
            >
              Close Preview
            </Button>
          </View>
        </BottomSheetView>
      </BottomSheetModal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    justifyContent: "flex-end",
    paddingHorizontal: 8,
  },
  content: {
    flex: 1,
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 60,
  },
  centerSection: {
    alignItems: "center",
    justifyContent: "center",
    marginTop: 40,
  },
  outerCircle: {
    width: 200,
    height: 200,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 40,
  },
  innerCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
  },
  segment: {
    position: "absolute",
    width: 40,
    height: 14,
    borderRadius: 7,
  },
  deviceName: {
    fontWeight: "400",
    marginBottom: 4,
    textAlign: 'center',
  },
  deviceId: {
    opacity: 0.7,
  },
  bottomSection: {
    width: "100%",
    alignItems: "center",
    paddingHorizontal: 40,
  },
  quickSaveLabel: {
    marginBottom: 12,
    opacity: 0.8,
  },
  segmentedButtons: {
    width: "100%",
  },
  modalContainer: {
    flex: 1,
    margin: 0,
    justifyContent: 'flex-end',
  },
  modalContent: {
    flex: 1,
    padding: 0,
  },
  modalBody: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingBottom: 100,
  },
  iconCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
    borderWidth: 0,
  },
  transferContent: {
    flex: 1,
    width: '100%',
  },
  deviceCard: {
    borderRadius: 24,
    width: '100%',
  },
  deviceCardContent: {
    flexDirection: "row",
    padding: 24,
    alignItems: "center",
  },
  deviceIcon: {
    marginRight: 20,
  },
  deviceInfoModal: {
    flex: 1,
  },
  cardTitle: {
    fontWeight: '500',
  },
  badgeRowExtended: {
    flexDirection: "row",
    gap: 8,
    marginTop: 8,
  },
  idBadge: {
    paddingHorizontal: 12,
    paddingVertical: 2,
    borderRadius: 8,
    borderWidth: 1,
  },
  idBadgeText: {
    fontWeight: "500",
    fontSize: 12,
  },
  osBadge: {
    paddingHorizontal: 12,
    paddingVertical: 2,
    borderRadius: 8,
    borderWidth: 1,
  },
  osBadgeText: {
    fontWeight: "500",
    fontSize: 12,
  },
  arrowContainerModal: {
    paddingVertical: 32,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 120,
    width: '100%',
  },
  doneCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalActionContainer: {
    width: '100%',
    alignItems: 'center',
    marginTop: 48,
  },
  doneButton: {
    borderRadius: 30,
    width: 200,
  },
  cancelButtonModal: {
    borderRadius: 30,
    width: 160,
  },
  pairingName: {
    fontWeight: '800',
    textAlign: 'center',
    fontSize: 40,
    letterSpacing: -1,
    marginBottom: 16,
  },
  wantsToSend: {
    fontSize: 18,
    fontWeight: '500',
    opacity: 0.8,
  },
  modalFooter: {
    gap: 16,
    paddingBottom: 20,
  },
  optionsButtonCompact: {
    alignSelf: 'center',
    marginBottom: 10,
    borderRadius: 20,
  },
  footerActionRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 12,
    paddingHorizontal: 32,
  },
  actionButtonWrapper: {
    flex: 1,
    maxWidth: 140,
  },
  compactPillButton: {
    borderRadius: 24,
  },
  compactButtonContent: {
    height: 44,
  },
  compactButtonLabel: {
    fontWeight: '700',
    fontSize: 14,
    textTransform: 'none',
  },
  modalHeaderList: {
    paddingHorizontal: 24,
    paddingTop: 8,
    paddingBottom: 16,
    gap: 2,
  },
  modalHeaderTitle: {
    fontSize: 22,
    fontWeight: 'normal',
  },
  saveToText: {
    fontSize: 14,
  },
  modalItemList: {
    flex: 1,
    paddingHorizontal: 24,
  },
  modalFileRow: {
    flexDirection: 'row',
    gap: 16,
    alignItems: 'center',
    marginBottom: 24,
  },
  modalFileIconContainer: {
    width: 44,
    height: 44,
    borderWidth: 1,
    borderRadius: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalFileDetails: {
    flex: 1,
    gap: 12,
  },
  modalFileName: {
    opacity: 0.9,
    fontSize: 14,
  },
  modalItemProgressBarContainer: {
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
  },
  modalItemProgressBar: {
    height: '100%',
  },
  modalFooterList: {
    padding: 24,
    gap: 32,
  },
  modalTotalProgressSection: {
    gap: 12,
  },
  modalTotalProgressLabel: {
    opacity: 0.9,
    fontSize: 18,
  },
  modalTotalProgressBarContainer: {
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
  },
  modalTotalProgressBar: {
    height: '100%',
  },
  modalActionRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    gap: 16,
  },
  actionButtonLabel: {
    fontSize: 14,
    fontWeight: 'normal',
  },
  fileNameRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
  },
  fileSizeText: {
    fontSize: 11,
    opacity: 0.7,
    fontWeight: '500',
  },
  advancedIcon: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  advancedIconText: {
    fontSize: 10,
    fontWeight: 'bold',
  },
  advancedStats: {
    paddingBottom: 16,
    gap: 4,
  },
  advancedStatText: {
    fontSize: 13,
    fontWeight: '500',
    opacity: 0.8,
  },
  minimizedBanner: {
    width: '100%',
    marginTop: 24,
    borderRadius: 16,
  },
  minimizedContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
  },
  minimizedIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(0,0,0,0.05)',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
