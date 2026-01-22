import React, { useState, useEffect, useRef, useCallback } from "react";
import { StyleSheet, View, Platform, ScrollView, Image } from "react-native";
import { IconButton, Text, useTheme, Modal, Portal, Button, Card, ActivityIndicator } from "react-native-paper";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import Svg, { G, Path } from "react-native-svg";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import * as Network from "expo-network";
import * as FileSystem from "expo-file-system/legacy";
import { uniqueNamesGenerator, adjectives, animals } from "unique-names-generator";
import AsyncStorage from "@react-native-async-storage/async-storage";
import HistoryPortal from "@/components/HistoryPortal";
import { useFocusEffect } from "@react-navigation/native";

export default function ReceiveScreen() {
  const theme = useTheme();
  const router = useRouter();
  const [deviceName, setDeviceName] = useState("");
  const [deviceId, setDeviceId] = useState("");
  const [pendingRequest, setPendingRequest] = useState<any>(null);
  const [discoveredDesktops, setDiscoveredDesktops] = useState<string[]>([]);
  
  // Transfer State
  const [transferStatus, setTransferStatus] = useState<'idle' | 'waiting-transfer' | 'downloading' | 'done' | 'error'>('idle');
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
  
  const lastDownloadedRef = useRef(0);
  const prevBytesRef = useRef(0);
  const speedIntervalRef = useRef<any>(null);

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

    } else if (transferStatus === 'done') {
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
  }, [transferStatus, transferStartTime]);

  const formatDuration = (seconds: number) => {
    const min = Math.floor(seconds / 60);
    const sec = seconds % 60;
    return `${min}:${sec.toString().padStart(2, '0')}`;
  };

  const loadIdentity = useCallback(async () => {
    let name = await AsyncStorage.getItem("deviceName");
    let id = await AsyncStorage.getItem("deviceId");

    if (!name) {
      name = uniqueNamesGenerator({
        dictionaries: [adjectives, animals],
        length: 2,
        separator: ' ',
        style: 'capital'
      });
      await AsyncStorage.setItem("deviceName", name);
    }

    setDeviceName(name || "");

    // Use last octet of IP as the "Port" (ID)
    const ip = await Network.getIpAddressAsync();
    if (ip && !ip.includes(':')) {
      const parts = ip.split('.');
      const lastOctet = parts[parts.length - 1];
      setDeviceId(lastOctet);
      await AsyncStorage.setItem("deviceId", lastOctet);
    } else if (id) {
      setDeviceId(id);
    } else {
      setDeviceId("000");
    }
  }, []);

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
      try {
        const myIp = await Network.getIpAddressAsync();
        if (!myIp || myIp.includes(':')) return;

        // Consistent pollId generation
        const pollId = deviceId || (myIp.includes('.') ? myIp.split('.').pop()! : "000");

        // If we have a pending request, check specifically if it still exists
        // But DON'T clear it if we are already transferring or finished
        if (pendingRequest) {
          if (transferStatus !== 'idle') return;

          try {
            const res = await fetch(`http://${pendingRequest.desktopIp}:3030/check-pairing-requests/${pollId}`);
            if (res.ok) {
              const data = await res.json();
              if (data.status !== 'pending') {
                setPendingRequest(null);
                setTransferStatus('idle');
              }
            } else {
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

        // Search for new requests from known desktops
        for (const desktopIp of currentDesktops) {
          try {
            const res = await fetch(`http://${desktopIp}:3030/check-pairing-requests/${pollId}`);
            if (res.ok) {
              const data = await res.json();
              if (data.status === 'pending') {
                setPendingRequest({ ...data.request, desktopIp });
                break; // Only show one at a time
              }
            }
          } catch (e) {
            // Remove desktop if unreachable
            setDiscoveredDesktops(prev => prev.filter(ip => ip !== desktopIp));
          }
        }
      } catch (e) {}
    };

    const interval = setInterval(pollForRequests, 2000);
    return () => clearInterval(interval);
  }, [discoveredDesktops, transferStatus]); // Don't poll while transferring if possible, or filter logic

  // Poll for Transfer Manifest (Receiver Flow)
  useEffect(() => {
    let polling = true;
    const checkTransferStatus = async () => {
      if (transferStatus !== 'waiting-transfer' || !pendingRequest) return;
      
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
           }
        }
      } catch (e) {}
      
      if (polling && transferStatus === 'waiting-transfer') setTimeout(checkTransferStatus, 1000);
    };

    if (transferStatus === 'waiting-transfer') {
      checkTransferStatus();
    }
    return () => { polling = false; };
  }, [transferStatus, pendingRequest]);

  const downloadFiles = async (files: any[], desktopIp: string, myId: string | null) => {
    let downloaded = 0;
    const total = files.reduce((acc, f) => acc + f.size, 0);
    setTotalTransferSize(total);
    setDownloadedBytes(0);
    lastDownloadedRef.current = 0;
    
    setTransferFiles(files.map(f => ({ ...f, progress: 0, status: 'waiting' })));

    for (const file of files) {
      setCurrentFilename(file.name);
      setTransferFiles(prev => prev.map(f => f.index === file.index ? { ...f, status: 'downloading' } : f));
      
      try {
        const uri = `http://${desktopIp}:3030/download/${myId}/${file.index}`;
        // @ts-ignore
        const fileUri = FileSystem.documentDirectory + file.name;

        const resumable = FileSystem.createDownloadResumable(
          uri,
          fileUri,
          {},
          (downloadProgress: FileSystem.DownloadProgressData) => {
            const currentFileDownloaded = downloadProgress.totalBytesWritten;
            const totalDownloadedSoFar = downloaded + currentFileDownloaded;
            lastDownloadedRef.current = totalDownloadedSoFar;
            setDownloadedBytes(totalDownloadedSoFar);
            setDownloadProgress(totalDownloadedSoFar / total);
            setTransferFiles(prev => prev.map(f => f.index === file.index ? { ...f, progress: currentFileDownloaded / file.size } : f));
          }
        );

        const downloadRes = await resumable.downloadAsync();
        
        if (downloadRes && (downloadRes.status === 200 || downloadRes.status === 201)) {
           downloaded += file.size;
           lastDownloadedRef.current = downloaded; 
           setDownloadedBytes(downloaded); 
           setDownloadProgress(downloaded / total); 
           setTransferFiles(prev => prev.map(f => f.index === file.index ? { ...f, status: 'done', progress: 1, localUri: fileUri } : f));
        } else {
           throw new Error(`Download failed`);
        }
      } catch (e) {
        setTransferStatus('error');
        return;
      }
    }
    setTransferStatus('done');
    setCurrentSpeed(0);
  };

  const respondToRequest = async (accepted: boolean) => {
    if (!pendingRequest) return;
    
    if (!accepted) {
      // Decline logic
      try {
        const myIp = await Network.getIpAddressAsync();
        const pollId = deviceId || (myIp.includes('.') ? myIp.split('.').pop() : myIp);
        await fetch(`http://${pendingRequest.desktopIp}:3030/respond-to-connection`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ deviceId: pollId, accepted: false })
        });
      } catch (e) {}
      setPendingRequest(null);
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
        <IconButton
          icon="history"
          size={24}
          onPress={() => setHistoryVisible(true)}
        />
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
          dismissable={true}
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
                      mode="text"
                      onPress={() => {}}
                      icon="cog"
                      textColor={theme.colors.onSurfaceVariant}
                      style={styles.optionsButtonCompact}
                      labelStyle={{ fontSize: 13, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1 }}
                    >
                      Options
                    </Button>

                    <View style={styles.footerActionRow}>
                      <Button
                        mode="contained"
                        onPress={() => respondToRequest(false)}
                        style={styles.declineButtonCompact}
                        buttonColor={theme.colors.errorContainer}
                        textColor={theme.colors.onErrorContainer}
                        contentStyle={styles.buttonContentHeight}
                        labelStyle={styles.buttonLabel}
                        icon="close"
                      >
                        Decline
                      </Button>
                      <Button
                        mode="contained"
                        onPress={() => respondToRequest(true)}
                        style={styles.acceptButtonCompact}
                        buttonColor={theme.colors.primaryContainer}
                        textColor={theme.colors.onPrimaryContainer}
                        contentStyle={styles.buttonContentHeight}
                        labelStyle={styles.buttonLabel}
                        icon="check"
                      >
                        Accept
                      </Button>
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

              {transferStatus !== 'idle' && (transferStatus === 'waiting-transfer' || transferStatus === 'downloading' || transferStatus === 'done' || transferStatus === 'error') && pendingRequest && (
                 <View style={[styles.transferContent, { backgroundColor: theme.colors.surface, flex: 1 }]}>
                    <View style={styles.modalHeaderList}>
                       <Text style={[styles.modalHeaderTitle, { color: theme.colors.onSurface }]}>
                          {transferStatus === 'done' ? 'Finished' : 'Receiving files'}
                       </Text>
                       <Text style={[styles.saveToText, { color: theme.colors.secondary }]}>
                          Save to folder: <Text style={[styles.saveToLink, { color: theme.colors.primary }]}>/storage/emulated/0/Download</Text>
                       </Text>
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
                               {file.status === 'done' && <Text style={{ color: theme.colors.primary, fontSize: 12, marginTop: -4 }}>Done</Text>}
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

                       <View style={styles.modalActionRow}>
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

                          <Button 
                            mode="text" 
                            onPress={() => {
                               if (transferStatus === 'done' || transferStatus === 'error') {
                                 closeTransfer();
                               } else {
                                 respondToRequest(false);
                               }
                            }} 
                            textColor={theme.colors.primary} 
                            labelStyle={styles.actionButtonLabel}
                            icon={transferStatus === 'done' ? 'check-circle' : 'close'}
                          >
                            {transferStatus === 'done' ? 'Done' : 'Cancel'}
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
    borderWidth: 1,
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
  },
  footerActionRow: {
    flexDirection: 'row',
    gap: 12,
  },
  declineButtonCompact: {
    flex: 1,
    borderRadius: 20,
  },
  acceptButtonCompact: {
    flex: 1,
    borderRadius: 20,
  },
  buttonContentHeight: {
    height: 60,
  },
  buttonLabel: {
    fontWeight: '800',
    fontSize: 13,
    textTransform: 'uppercase',
    letterSpacing: 1,
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
  saveToLink: {
    textDecorationLine: 'underline',
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
