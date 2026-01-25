import React, { useEffect, useState, useRef } from "react";
import { StyleSheet, View, ScrollView, Platform } from "react-native";
import { Text, useTheme, Card, IconButton, Button, ActivityIndicator, Modal, Portal } from "react-native-paper";
import { SafeAreaView } from "react-native-safe-area-context";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import * as Device from "expo-device";
import * as Network from "expo-network";
import { useSettingsStore } from "@/store/useSettingsStore";
import { useSelection } from "@/hooks/useSelection";
import Animated, { 
  useSharedValue, 
  useAnimatedStyle, 
  withTiming, 
  withRepeat
} from "react-native-reanimated";

interface SendingPortalProps {
  visible: boolean;
  onDismiss: () => void;
  targetDevice: {
    name: string;
    id: string;
    os: string;
    ip: string;
    port: number;
    platform: 'desktop' | 'mobile';
  } | null;
}

const SendingPortal = ({ visible, onDismiss, targetDevice }: SendingPortalProps) => {
  const theme = useTheme();
  const { selectedItems, clearSelection } = useSelection();
  
  const [status, setStatus] = useState<'waiting' | 'sending' | 'refused' | 'error' | 'done'>('waiting');
  const [progress, setProgress] = useState(0);
  const [currentFile, setCurrentFile] = useState("");
  const abortController = useRef(new AbortController());

  const [transferStartTime, setTransferStartTime] = useState<number | null>(null);
  const [transferDuration, setTransferDuration] = useState(0);
  const [downloadedBytes, setDownloadedBytes] = useState(0);
  const [currentFileIndex, setCurrentFileIndex] = useState(0);
  const [totalTransferSize, setTotalTransferSize] = useState(0);
  const [currentSpeed, setCurrentSpeed] = useState(0);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [displayItems, setDisplayItems] = useState<any[]>([]);
  
  const lastUploadedRef = useRef(0);
  const prevBytesRef = useRef(0);
  const speedIntervalRef = useRef<any>(null);
  const speedsRef = useRef<number[]>([]);

  const pulse = useSharedValue(1);

  const hasStartedRef = useRef(false);

  useEffect(() => {
    if (visible && targetDevice && !hasStartedRef.current) {
      hasStartedRef.current = true;
      setDisplayItems([...selectedItems]);
      // Reset only when starting a new session
      setStatus('waiting');
      setProgress(0);
      setCurrentFile("");
      setDownloadedBytes(0);
      setCurrentFileIndex(0);
      setTotalTransferSize(0);
      setCurrentSpeed(0);
      setTransferDuration(0);
      setTransferStartTime(null);
      
      pulse.value = withRepeat(withTiming(1.1, { duration: 1000 }), -1, true);
      connectAndSend();
    } else if (!visible) {
      // Reset the start flag when the portal is closed
      hasStartedRef.current = false;
      // Cleanup
      abortController.current.abort();
      abortController.current = new AbortController();
    }
    
    return () => {
      // We don't abort here because it might be a parent re-render
      // Only abort on actual unmount or visibility change (handled above)
    };
  }, [visible]); // Only trigger on visibility change

  const animatedPulse = useAnimatedStyle(() => ({
    transform: [{ scale: pulse.value }],
    opacity: 1.2 - pulse.value
  }));

  const formatFileSize = (bytes: number) => {
    if (!bytes || bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  useEffect(() => {
    let interval: any;
    if (status === 'sending') {
      if (!transferStartTime) setTransferStartTime(Date.now());
      interval = setInterval(() => {
        if (transferStartTime) {
          setTransferDuration(Math.floor((Date.now() - transferStartTime) / 1000));
        }
      }, 1000);

      prevBytesRef.current = 0;
      speedsRef.current = [];
      speedIntervalRef.current = setInterval(() => {
        const current = lastUploadedRef.current;
        const diff = current - prevBytesRef.current;
        const speed = Math.max(0, diff);
        
        speedsRef.current.push(speed);
        if (speedsRef.current.length > 3) speedsRef.current.shift();
        
        const avgSpeed = speedsRef.current.reduce((a, b) => a + b, 0) / speedsRef.current.length;
        setCurrentSpeed(avgSpeed);
        
        prevBytesRef.current = current;
      }, 1000);

    } else if (status === 'done') {
      setCurrentSpeed(0);
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
  }, [status, transferStartTime]);

  const formatDuration = (seconds: number) => {
    const min = Math.floor(seconds / 60);
    const sec = seconds % 60;
    return `${min}:${sec.toString().padStart(2, '0')}`;
  };

  const connectAndSend = async () => {
    if (!targetDevice || !visible) return;
    
    // Abort any existing request before starting a new one
    abortController.current.abort();
    abortController.current = new AbortController();
    const signal = abortController.current.signal;
    const itemsToSend = [...selectedItems];

    try {
      const brand = Device.brand || Device.modelName || "Mobile";
      const { deviceName, deviceId } = useSettingsStore.getState();
      const name = deviceName || Device.deviceName || "Mobile Device";
      
      let pollId = deviceId;
      if (!pollId) {
        const myIp = await Network.getIpAddressAsync();
        pollId = (myIp && myIp.includes('.')) ? myIp.split('.').pop()! : 'mobile';
      }
      
      console.log(`[SendingPortal] Initiating request to http://${targetDevice.ip}:${targetDevice.port}/request-connect`);
      setStatus('waiting');

      const res = await fetch(`http://${targetDevice.ip}:${targetDevice.port}/request-connect`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({
          deviceId: pollId,
          name,
          platform: 'mobile',
          brand,
          totalFiles: itemsToSend.length,
          totalSize: itemsToSend.reduce((acc, item) => acc + (item.size || 0), 0),
          files: itemsToSend.map(item => ({ name: item.name, size: item.size, type: item.type }))
        }),
        signal: signal
      });

      if (!res.ok) {
        throw new Error(`Server responded with ${res.status}`);
      }
      
      const data = await res.json();
      if (data.status === 'accepted') {
        setStatus('sending');
        // Start upload flow
        setTimeout(() => uploadFiles(pollId!, itemsToSend), 100);
      } else if (data.status === 'declined' || data.status === 'cancelled') {
        setStatus('refused');
      } else {
        setStatus('refused');
      }

    } catch (e: any) {
      if (e.name === 'AbortError') {
        console.log('[SendingPortal] Request aborted');
      } else {
        console.error('[SendingPortal] Connection Error:', e);
        setStatus('error');
        // Only alert if we're still visible
        if (visible) {
          alert("Could not connect to desktop. Please ensure both devices are on the same Wi-Fi and the desktop app is active.");
        }
      }
    }
  };

  const uploadFiles = async (myId: string, items: any[]) => {
    if (!targetDevice) return;
    let totalBytes = items.reduce((acc, item) => acc + (item.size || 0), 0);
    setTotalTransferSize(totalBytes);
    let uploadedOverall = 0;
    lastUploadedRef.current = 0;

    for (let i = 0; i < items.length; i++) {
        const item = items[i];
        setCurrentFile(item.name);
        setCurrentFileIndex(i);
        
        try {
            const formData = new FormData();
            formData.append('file', {
                uri: item.uri,
                type: item.mimeType || 'application/octet-stream',
                name: item.name,
            } as any);
            
            const uploadPromise = new Promise<boolean>((resolve, reject) => {
                const xhr = new XMLHttpRequest();
                
                xhr.upload.onprogress = (event) => {
                    if (event.lengthComputable) {
                        const currentFileUploaded = event.loaded;
                        const totalUploadedSoFar = uploadedOverall + currentFileUploaded;
                        lastUploadedRef.current = totalUploadedSoFar;
                        setDownloadedBytes(totalUploadedSoFar);
                        setProgress(totalUploadedSoFar / totalBytes);
                    }
                };
                
                xhr.onload = () => {
                    if (xhr.status >= 200 && xhr.status < 300) {
                        resolve(true);
                    } else {
                        reject(new Error(`Upload failed with status ${xhr.status}`));
                    }
                };
                
                xhr.onerror = () => reject(new Error('Network error'));
                xhr.onabort = () => reject(new Error('Upload aborted'));
                
                xhr.open('POST', `http://${targetDevice.ip}:${targetDevice.port}/upload`);
                xhr.setRequestHeader('x-transfer-id', myId);
                xhr.send(formData);
            });
            
            await uploadPromise;
            
            uploadedOverall += item.size || 0;
            lastUploadedRef.current = uploadedOverall;
            setDownloadedBytes(uploadedOverall);
            setProgress(uploadedOverall / totalBytes);

        } catch (e: any) {
             if (e.name !== 'AbortError' && e.message !== 'Upload aborted') {
                setStatus('error');
                return;
             }
        }
    }
    
    try {
        const myIp = await Network.getIpAddressAsync();
        const pollId = (myIp && myIp.includes('.')) ? myIp.split('.').pop()! : 'mobile';
        await fetch(`http://${targetDevice.ip}:${targetDevice.port}/transfer-finish/${pollId}`).catch(() => {});
    } catch (e) {}

    setStatus('done');
    setProgress(1); // Explicitly set to 1 to ensure full progress bar
    setDownloadedBytes(totalBytes);
    setCurrentFileIndex(items.length);
    setCurrentSpeed(0);
  };

  const handleCancel = async () => {
    abortController.current.abort();
    
    // Clear selection if we finished successfully
    if (status === 'done') {
      clearSelection();
    }

    if (targetDevice) {
      try {
        const myIp = await Network.getIpAddressAsync();
        const pollId = (myIp && myIp.includes('.')) ? myIp.split('.').pop() : '000';
        // Call both to ensure pairing or active transfer is cancelled
        fetch(`http://${targetDevice.ip}:${targetDevice.port}/cancel-transfer/${pollId}`).catch(() => {});
        fetch(`http://${targetDevice.ip}:${targetDevice.port}/cancel-pairing/${pollId}`).catch(() => {});
      } catch (e) {}
    }
    onDismiss();
  };

  return (
    <Portal>
      <Modal
        visible={visible}
        onDismiss={handleCancel}
        dismissable={status === 'done' || status === 'error' || status === 'refused' || status === 'waiting'}
        contentContainerStyle={[
          styles.modalContainer,
          { backgroundColor: theme.colors.background }
        ]}
      >
        <SafeAreaView style={styles.safeArea} edges={['bottom']}>
          <View style={styles.container}>
            { (status === 'waiting' || status === 'refused') ? (
              <View style={styles.waitingContainer}>
                 <View style={styles.pairingCircleContainer}>
                    <Animated.View style={[styles.pulseCircle, animatedPulse]} />
                    <View style={[styles.pairingCircle, { backgroundColor: theme.colors.surfaceVariant, borderColor: theme.colors.outlineVariant }]}>
                       <MaterialCommunityIcons 
                         name={targetDevice?.platform === 'desktop' ? "laptop" : "cellphone"} 
                         size={60} 
                         color={theme.colors.primary} 
                       />
                    </View>
                 </View>
                 
                 <Text variant="headlineMedium" style={[styles.waitingTitle, { color: theme.colors.onSurface }]}>
                   {targetDevice?.name || 'Device'}
                 </Text>
                 <View style={[styles.idBadgeSmall, { backgroundColor: theme.colors.surfaceVariant, borderColor: theme.colors.outlineVariant }]}>
                    <Text style={[styles.idBadgeTextSmall, { color: theme.colors.onSurfaceVariant }]}>
                      #{targetDevice?.id || '000'}
                    </Text>
                 </View>
                 
                 <Text style={[styles.waitingStatus, { color: theme.colors.onSurfaceVariant }]}>
                   {status === 'waiting' ? 'Waiting for response...' : 'Connection refused'}
                 </Text>
                 
                 <Button 
                   mode="contained" 
                   onPress={handleCancel} 
                   style={styles.cancelRequestButton}
                   buttonColor={theme.colors.surfaceVariant}
                   textColor={theme.colors.onSurfaceVariant}
                 >
                   Cancel Request
                 </Button>
              </View>
            ) : (
              <>
                <View style={[styles.header, status === 'done' && { alignItems: 'center', paddingTop: 30 }]}>
                  {status === 'done' ? (
                    <View style={{ alignItems: 'center', gap: 12 }}>
                      <View style={{ backgroundColor: theme.colors.primaryContainer, width: 64, height: 64, borderRadius: 32, alignItems: 'center', justifyContent: 'center' }}>
                        <MaterialCommunityIcons name="check" size={40} color={theme.colors.primary} />
                      </View>
                      <Text variant="headlineSmall" style={[styles.headerTitle, { color: theme.colors.onSurface, fontWeight: '800' }]}>
                        Sent successfully
                      </Text>
                      <Text style={{ color: theme.colors.onSurfaceVariant, marginTop: -4 }}>
                        to {targetDevice?.name || 'Device'}
                      </Text>
                    </View>
                  ) : (
                    <Text variant="headlineSmall" style={[styles.headerTitle, { color: theme.colors.onSurface }]}>
                      {status === 'sending' ? 'Sending files' : 'Preparing...'}
                    </Text>
                  )}
                </View>

                <ScrollView style={styles.itemList} contentContainerStyle={styles.itemListContent}>
                  {displayItems.map((item, idx) => {
                    const isCurrent = status === 'sending' && idx === currentFileIndex;
                    const isDone = status === 'done' || (status === 'sending' && idx < currentFileIndex);
                    
                    let itemProgress = 0;
                    if (isDone) itemProgress = 100;
                    else if (isCurrent) {
                      const totalItems = selectedItems.length;
                      const progressPerItem = 1 / totalItems;
                      const completedItemsProgress = idx * progressPerItem;
                      itemProgress = Math.min(100, Math.max(0, ((progress - completedItemsProgress) / progressPerItem) * 100));
                    }

                    return (
                      <View key={item.id} style={[styles.fileRow, !isCurrent && !isDone && status === 'sending' && { opacity: 0.4 }]}>
                        <View style={[styles.fileIconContainer, { backgroundColor: theme.colors.surfaceVariant, borderColor: theme.colors.outlineVariant }]}>
                          <MaterialCommunityIcons name="file-outline" size={24} color={theme.colors.onSurfaceVariant} opacity={0.8} />
                        </View>
                        <View style={styles.fileDetails}>
                           <Text style={[styles.fileName, { color: theme.colors.onSurface }]}>
                             {item.name} ({ formatFileSize(item.size) })
                           </Text>
                           {isDone && (
                             <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: -4 }}>
                               <MaterialCommunityIcons name="check-circle" size={14} color={theme.colors.primary} />
                               <Text style={{ color: theme.colors.primary, fontSize: 12 }}>Done</Text>
                             </View>
                           )}
                           <View style={[styles.itemProgressBarContainer, { backgroundColor: theme.colors.surfaceVariant }]}>
                              <View style={[styles.itemProgressBar, { backgroundColor: theme.colors.primary, width: `${itemProgress}%` }]} />
                           </View>
                        </View>
                      </View>
                    );
                  })}
                </ScrollView>

                <View style={styles.footer}>
                  <View style={styles.totalProgressSection}>
                    <Text variant="titleMedium" style={[styles.totalProgressLabel, { color: theme.colors.onSurface }]}>
                      {status === 'done' ? 'Finished' : `Total progress (${formatDuration(transferDuration)})`}
                    </Text>
                    <View style={[styles.totalProgressBarContainer, { backgroundColor: theme.colors.surfaceVariant }]}>
                      <View style={[styles.totalProgressBar, { backgroundColor: theme.colors.primary, width: `${progress * 100}%` }]} />
                    </View>
                  </View>

                  {showAdvanced && (
                     <View style={styles.advancedStats}>
                       <Text style={[styles.advancedStatText, { color: theme.colors.onSurfaceVariant }]}>
                         Files: {Math.floor(progress * selectedItems.length)} / {selectedItems.length}
                       </Text>
                       <Text style={[styles.advancedStatText, { color: theme.colors.onSurfaceVariant }]}>
                         Size: {formatFileSize(downloadedBytes)} / {formatFileSize(totalTransferSize)}
                       </Text>
                       <Text style={[styles.advancedStatText, { color: theme.colors.onSurfaceVariant }]}>
                         Speed: {formatFileSize(currentSpeed)}/s
                       </Text>
                     </View>
                  )}

                  <View style={[status === 'done' ? styles.actionRowDone : styles.actionRow, status === 'done' && { justifyContent: 'center' }]}>
                     {status !== 'done' && (
                       <Button 
                        mode="text" 
                        onPress={() => setShowAdvanced(!showAdvanced)} 
                        textColor={theme.colors.primary} 
                        labelStyle={styles.actionButtonLabel}
                        icon={showAdvanced ? 'eye-off' : () => (
                          <View style={[styles.advancedIcon, { borderColor: theme.colors.outlineVariant }]}>
                             <Text style={[styles.advancedIconText, { color: theme.colors.primary }]}>i</Text>
                          </View>
                        )}
                       >
                         {showAdvanced ? 'Hide' : 'Advanced'}
                       </Button>
                     )}

                      <Button 
                       mode={status === 'done' ? "contained" : "text"} 
                       onPress={handleCancel} 
                       textColor={status === 'done' ? theme.colors.onPrimary : theme.colors.primary} 
                       buttonColor={status === 'done' ? theme.colors.primary : undefined}
                       labelStyle={[
                         styles.actionButtonLabel,
                         status === 'done' && { fontWeight: 'bold', paddingHorizontal: 24, fontSize: 16 }
                       ]}
                       style={status === 'done' ? { borderRadius: 28, width: 200 } : { borderRadius: 28 }}
                       contentStyle={status === 'done' ? { height: 50 } : {}}
                       icon={status === 'done' ? 'check-circle' : 'close'}
                      >
                       {status === 'done' ? 'Done' : 'Cancel'}
                      </Button>
                  </View>
                </View>
              </>
            )}
          </View>
        </SafeAreaView>
      </Modal>
    </Portal>
  );
};

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
    margin: 0,
    width: '100%',
    height: '100%',
  },
  safeArea: {
    flex: 1,
  },
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 24,
    paddingTop: Platform.OS === 'android' ? 20 : 10,
    paddingBottom: 20,
  },
  headerTitle: {
    fontWeight: '400',
  },
  itemList: {
    flex: 1,
  },
  itemListContent: {
    paddingHorizontal: 24,
    paddingBottom: 40,
  },
  fileRow: {
    flexDirection: 'row',
    gap: 16,
    alignItems: 'center',
    marginBottom: 24,
  },
  fileIconContainer: {
    width: 44,
    height: 44,
    borderWidth: 1,
    borderRadius: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fileDetails: {
    flex: 1,
    gap: 12,
  },
  fileName: {
    fontSize: 14,
  },
  itemProgressBarContainer: {
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
  },
  itemProgressBar: {
    height: '100%',
  },
  footer: {
    padding: 24,
    paddingBottom: 40,
    gap: 32,
  },
  totalProgressSection: {
    gap: 12,
  },
  totalProgressLabel: {
  },
  totalProgressBarContainer: {
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
  },
  totalProgressBar: {
    height: '100%',
  },
  actionRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
    flexWrap: 'wrap',
  },
  actionRowDone: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 16,
  },
  actionButtonLabel: {
    fontSize: 14,
    fontWeight: 'normal',
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
    opacity: 0.7,
  },
  waitingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
  },
  pairingCircleContainer: {
    width: 180,
    height: 180,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 40,
  },
  pulseCircle: {
    position: 'absolute',
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: 'rgba(94, 177, 177, 0.2)',
  },
  pairingCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 4,
  },
  waitingTitle: {
    fontWeight: '400',
    marginBottom: 8,
  },
  idBadgeSmall: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 40,
  },
  idBadgeTextSmall: {
    fontSize: 12,
    fontWeight: '500',
  },
  waitingStatus: {
    fontSize: 16,
    marginBottom: 60,
    textAlign: 'center',
  },
  cancelRequestButton: {
    width: '100%',
    height: 56,
    borderRadius: 16,
    justifyContent: 'center',
  },
});

export default SendingPortal;
