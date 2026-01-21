import React, { useEffect, useState, useRef } from "react";
import { StyleSheet, View, ScrollView } from "react-native";
import { Text, useTheme, Card, IconButton, Button, ActivityIndicator } from "react-native-paper";
import { SafeAreaView } from "react-native-safe-area-context";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useRouter, useLocalSearchParams } from "expo-router";
import * as Device from "expo-device";
import * as Network from "expo-network";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useSelection } from "@/hooks/useSelection";
import Animated, { 
  useSharedValue, 
  useAnimatedStyle, 
  withSpring, 
  withDelay,
  Easing,
  withTiming
} from "react-native-reanimated";

export default function SendingScreen() {
  const theme = useTheme();
  const router = useRouter();
  const params = useLocalSearchParams();
  
  const { deviceName, deviceId, os, targetIp, targetPort } = params;
  const { selectedItems, clearSelection } = useSelection(); // Get items to send
  const [status, setStatus] = useState<'waiting' | 'sending' | 'refused' | 'error' | 'done'>('waiting');
  const [progress, setProgress] = useState(0);
  const [currentFile, setCurrentFile] = useState("");
  const abortController = useRef(new AbortController());

  const [transferStartTime, setTransferStartTime] = useState<number | null>(null);
  const [transferDuration, setTransferDuration] = useState(0);
  const [downloadedBytes, setDownloadedBytes] = useState(0);
  const [totalTransferSize, setTotalTransferSize] = useState(0);
  const [currentSpeed, setCurrentSpeed] = useState(0);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  
  const lastUploadedRef = useRef(0);
  const prevBytesRef = useRef(0);
  const speedIntervalRef = useRef<any>(null);

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

      // Speed calculation
      prevBytesRef.current = 0;
      speedIntervalRef.current = setInterval(() => {
        const current = lastUploadedRef.current;
        const diff = current - prevBytesRef.current;
        setCurrentSpeed(Math.max(0, diff));
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

  const topCardY = useSharedValue(50);

  useEffect(() => {
    // Start Connection Request
    connectAndSend();

    return () => {
      abortController.current.abort();
    };
  }, []);

  const connectAndSend = async () => {
    try {
      const brand = Device.brand || Device.modelName || "Mobile";
      const storedName = await AsyncStorage.getItem("deviceName");
      const name = storedName || Device.deviceName || "Mobile Device";
      const myIp = await Network.getIpAddressAsync();

      const res = await fetch(`http://${targetIp}:${targetPort}/request-connect`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          deviceId: myIp,
          name,
          platform: 'mobile',
          brand
        }),
        signal: abortController.current.signal
      });

      if (!res.ok) throw new Error("Connection refused");
      
      const data = await res.json();
      if (data.status === 'accepted') {
        setStatus('sending');
        await uploadFiles(myIp || 'mobile');
      } else {
        setStatus('refused');
        // Removed auto-dismiss to allow user to see the status and click Close
      }

    } catch (e: any) {
      if (e.name !== 'AbortError') {
        console.error(e);
        setStatus('error');
      }
    }
  };

  const uploadFiles = async (myId: string) => {
    let totalBytes = selectedItems.reduce((acc, item) => acc + (item.size || 0), 0);
    setTotalTransferSize(totalBytes);
    let uploaded = 0;
    lastUploadedRef.current = 0;

    for (let i = 0; i < selectedItems.length; i++) {
        const item = selectedItems[i];
        setCurrentFile(item.name);
        
        try {
            const formData = new FormData();
            formData.append('file', {
                uri: item.uri,
                name: item.name,
                type: item.type === 'media' ? 'image/jpeg' : 'application/octet-stream' // generic type
            } as any);

            const res = await fetch(`http://${targetIp}:${targetPort}/upload`, {
                method: 'POST',
                headers: {
                    'x-transfer-id': myId,
                    'Content-Type': 'multipart/form-data',
                },
                body: formData,
                signal: abortController.current.signal
            });
            
            if (!res.ok) throw new Error("Upload failed");
            uploaded += item.size;
            lastUploadedRef.current = uploaded;
            setDownloadedBytes(uploaded);
            setProgress(uploaded / totalBytes);

        } catch (e: any) {
             if (e.name !== 'AbortError') {
                setStatus('error');
                return;
             }
        }
    }
    setStatus('done');
    setCurrentSpeed(0);
    clearSelection();
  };

  const handleCancel = async () => {
    abortController.current.abort();
    try {
      const myIp = await Network.getIpAddressAsync();
      const pollId = (myIp && myIp.includes('.')) ? myIp.split('.').pop() : '000';
      // Notify desktop that we cancelled
      fetch(`http://${targetIp}:${targetPort}/cancel-pairing/${pollId}`).catch(() => {});
    } catch (e) {}
    router.back();
  };



  return (
    <SafeAreaView style={[styles.container, { backgroundColor: '#0b0e0e' }]}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>
          {status === 'done' ? 'Finished' : (status === 'waiting' ? 'Waiting...' : 'Sending files')}
        </Text>
      </View>

      <ScrollView style={styles.itemList} contentContainerStyle={styles.itemListContent}>
        {selectedItems.map((item, idx) => {
          const isCurrent = status === 'sending' && idx === Math.floor(progress / 100 * selectedItems.length); // Rough approximation for demo
          const isDone = status === 'done' || (status === 'sending' && idx < Math.floor(progress / 100 * selectedItems.length));
          const itemProgress = status === 'done' ? 100 : (isCurrent ? (progress % (100 / selectedItems.length)) * selectedItems.length : (isDone ? 100 : 0));

          return (
            <View key={item.id} style={[styles.fileRow, !isCurrent && !isDone && status === 'sending' && { opacity: 0.4 }]}>
              <View style={styles.fileIconContainer}>
                <MaterialCommunityIcons name="file-outline" size={24} color="white" opacity={0.8} />
              </View>
              <View style={styles.fileDetails}>
                 <Text style={styles.fileName}>
                   {item.name} ({ formatFileSize(item.size) })
                 </Text>
                 {isDone && <Text style={{ color: '#5eb1b1', fontSize: 12, marginTop: -4 }}>Done</Text>}
                 <View style={styles.itemProgressBarContainer}>
                    <View style={[styles.itemProgressBar, { width: `${itemProgress}%` }]} />
                 </View>
              </View>
            </View>
          );
        })}
      </ScrollView>

      {isMinimized && (
        <Card style={styles.minimizedBanner} onPress={() => setIsMinimized(false)}>
          <Card.Content style={styles.minimizedContent}>
            <ActivityIndicator size={20} color={theme.colors.primary} />
            <View style={{ flex: 1 }}>
              <Text variant="labelLarge">Sending {selectedItems.length} files...</Text>
              <Text variant="bodySmall">{currentFile}</Text>
            </View>
            <IconButton icon="open-in-new" size={20} />
          </Card.Content>
        </Card>
      )}

      <View style={styles.footer}>
        <View style={styles.totalProgressSection}>
          <Text style={styles.totalProgressLabel}>
            {status === 'done' ? 'Finished' : `Total progress (${formatDuration(transferDuration)})`}
          </Text>
          <View style={styles.totalProgressBarContainer}>
            <View style={[styles.totalProgressBar, { width: `${progress * 100}%` }]} />
          </View>
        </View>

        {showAdvanced && (
           <View style={styles.advancedStats}>
             <Text style={styles.advancedStatText}>Files: {Math.floor(progress * selectedItems.length)} / {selectedItems.length}</Text>
             <Text style={styles.advancedStatText}>Size: {formatFileSize(downloadedBytes)} / {formatFileSize(totalTransferSize)}</Text>
             <Text style={styles.advancedStatText}>Speed: {formatFileSize(currentSpeed)}/s</Text>
           </View>
        )}

        <View style={status === 'done' ? styles.actionRowDone : styles.actionRow}>
           <Button 
            mode="text" 
            onPress={() => setShowAdvanced(!showAdvanced)} 
            textColor="white" 
            labelStyle={styles.actionButtonLabel}
            icon={showAdvanced ? 'eye-off' : () => (
              <View style={styles.advancedIcon}>
                 <Text style={styles.advancedIconText}>i</Text>
              </View>
            )}
           >
             {showAdvanced ? 'Hide' : 'Advanced'}
           </Button>

           <Button 
            mode="text" 
            onPress={handleCancel} 
            textColor="white" 
            labelStyle={styles.actionButtonLabel}
            icon={status === 'done' ? 'check-circle' : 'close'}
           >
             {status === 'done' ? 'Done' : 'Cancel'}
           </Button>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 24,
    paddingTop: 40,
    paddingBottom: 20,
  },
  headerTitle: {
    color: 'white',
    fontSize: 22,
    fontWeight: 'normal',
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
    backgroundColor: '#151a1a',
    borderWidth: 1,
    borderColor: '#232a2a',
    borderRadius: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fileDetails: {
    flex: 1,
    gap: 12,
  },
  fileName: {
    color: 'white',
    opacity: 0.9,
    fontSize: 14,
  },
  itemProgressBarContainer: {
    height: 6,
    backgroundColor: '#151a1a',
    borderRadius: 3,
    overflow: 'hidden',
  },
  itemProgressBar: {
    height: '100%',
    backgroundColor: '#5eb1b1',
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
    color: 'white',
    opacity: 0.9,
    fontSize: 18,
  },
  totalProgressBarContainer: {
    height: 8,
    backgroundColor: '#151a1a',
    borderRadius: 4,
    overflow: 'hidden',
  },
  totalProgressBar: {
    height: '100%',
    backgroundColor: '#5eb1b1',
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
    borderColor: 'rgba(255,255,255,0.4)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  advancedIconText: {
    color: 'white',
    fontSize: 10,
    fontWeight: 'bold',
  },
  advancedStats: {
    paddingBottom: 16,
    gap: 4,
  },
  advancedStatText: {
    color: 'white',
    fontSize: 13,
    fontWeight: '500',
    opacity: 0.7,
  },
  minimizedBanner: {
    backgroundColor: '#151a1a',
    margin: 16,
    borderRadius: 12,
  },
  minimizedContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
});
