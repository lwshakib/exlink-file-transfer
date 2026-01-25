import React, { useState, useCallback, useRef, useMemo, useEffect } from "react";
import { StyleSheet, View, ScrollView, Platform, Dimensions, Image as RNImage } from "react-native";
import { Text, IconButton, useTheme, Card, Button, Portal, Dialog, TextInput } from "react-native-paper";
import { SafeAreaView } from "react-native-safe-area-context";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import * as DocumentPicker from "expo-document-picker";
import * as ImagePicker from "expo-image-picker";
import * as Clipboard from "expo-clipboard";
import * as Network from "expo-network";
import { BottomSheetModal, BottomSheetView, BottomSheetBackdrop } from "@gorhom/bottom-sheet";
import { useRouter } from "expo-router";
import { useSelection, SelectedItem } from "@/hooks/useSelection";
import SelectionDetailsPortal from "@/components/SelectionDetailsPortal";
import SendingPortal from "@/components/SendingPortal";
import AppPickerPortal from "@/components/AppPickerPortal";
import * as FileSystem from "expo-file-system/legacy";

import AsyncStorage from "@react-native-async-storage/async-storage";
import { useDiscoveryStore, NearbyDevice } from "@/store/useDiscoveryStore";
import { useSettingsStore } from "@/store/useSettingsStore";

export default function SendScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { selectedItems, addItems, clearSelection, totalSize } = useSelection();
  
  // Settings Store
  const deviceName = useSettingsStore(state => state.deviceName);
  const deviceId = useSettingsStore(state => state.deviceId);

  // Discovery Store
  const nearbyDevices = useDiscoveryStore(state => state.nearbyDevices);
  const isScanning = useDiscoveryStore(state => state.isScanning);
  const triggerScan = useDiscoveryStore(state => state.triggerScan);

  const [textDialogVisible, setTextDialogVisible] = useState(false);
  const [inputText, setInputText] = useState("");
  const [favoriteIds, setFavoriteIds] = useState<string[]>([]);

  const bottomSheetModalRef = useRef<BottomSheetModal>(null);
  const [selectionSheetVisible, setSelectionSheetVisible] = useState(false);
  const [sendingPortalVisible, setSendingPortalVisible] = useState(false);
  const [appPickerVisible, setAppPickerVisible] = useState(false);
  const [selectedDevice, setSelectedDevice] = useState<NearbyDevice | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const snapPoints = useMemo(() => ['45%'], []);

  useEffect(() => {
    loadFavorites();
  }, []);

  const loadFavorites = async () => {
    try {
      const stored = await AsyncStorage.getItem("favoriteDeviceIds");
      if (stored) {
        setFavoriteIds(JSON.parse(stored));
      }
    } catch (e) {}
  };

  const toggleFavorite = async (deviceId: string) => {
    try {
      const nextFavorites = favoriteIds.includes(deviceId)
        ? favoriteIds.filter(id => id !== deviceId)
        : [...favoriteIds, deviceId];
      
      setFavoriteIds(nextFavorites);
      await AsyncStorage.setItem("favoriteDeviceIds", JSON.stringify(nextFavorites));
    } catch (e) {}
  };

  const sortedDevices = useMemo(() => {
    return [...nearbyDevices].sort((a, b) => {
      const aFav = favoriteIds.includes(a.id);
      const bFav = favoriteIds.includes(b.id);
      if (aFav && !bFav) return -1;
      if (!aFav && bFav) return 1;
      return a.name.localeCompare(b.name);
    });
  }, [nearbyDevices, favoriteIds]);

  const startScanning = async () => {
    triggerScan();
  };

  const handleDevicePress = async (device: NearbyDevice) => {
    if (selectedItems.length === 0) {
      alert("Please select at least one item to share before connecting.");
      return;
    }
    
    setSelectedDevice(device);
    setSendingPortalVisible(true);
  };

  const getPortLabel = (id: string) => {
    if (!id) return "";
    if (id.includes('.')) {
        const parts = id.split('.');
        return `#${parts[parts.length - 1]}`;
    }
    return `#${id.slice(-3)}`;
  };

  const formatSize = (bytes: number) => {
    if (bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB", "TB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
  };

  const handleFilePick = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        multiple: true,
        type: "*/*",
      });

      if (!result.canceled) {
        const newItems: SelectedItem[] = result.assets.map(asset => ({
          id: asset.uri,
          name: asset.name,
          size: asset.size || 0,
          type: 'file',
          uri: asset.uri,
          mimeType: asset.mimeType || 'application/octet-stream',
        }));
        addItems(newItems);
        bottomSheetModalRef.current?.dismiss();
      }
    } catch (err) {
      console.error("Error picking document:", err);
    }
  };

  const handleMediaPick = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images', 'videos'],
        allowsMultipleSelection: true,
      });

      if (!result.canceled) {
        const newItems: SelectedItem[] = result.assets.map(asset => ({
          id: asset.uri,
          name: asset.fileName || asset.uri.split('/').pop() || "media",
          size: asset.fileSize || 0,
          type: 'media',
          uri: asset.uri,
          mimeType: asset.mimeType || (asset.type === 'video' ? 'video/mp4' : 'image/jpeg'),
        }));
        addItems(newItems);
        bottomSheetModalRef.current?.dismiss();
      }
    } catch (err) {
      console.error("Error picking media:", err);
    }
  };

  const handlePaste = async () => {
    const text = await Clipboard.getStringAsync();
    if (text) {
      const newItem: SelectedItem = {
        id: `paste-${Date.now()}`,
        name: "Pasted Text",
        size: text.length,
        type: 'text',
        content: text,
      };
      addItems([newItem]);
      bottomSheetModalRef.current?.dismiss();
    }
  };

  const handleAddText = () => {
    if (inputText.trim()) {
      const newItem: SelectedItem = {
        id: `text-${Date.now()}`,
        name: "Text Content",
        size: inputText.length,
        type: 'text',
        content: inputText,
      };
      addItems([newItem]);
      setInputText("");
      setTextDialogVisible(false);
      bottomSheetModalRef.current?.dismiss();
    }
  };

  const handleFolderPick = async () => {
    if (Platform.OS === 'android') {
      try {
        const permissions = await FileSystem.StorageAccessFramework.requestDirectoryPermissionsAsync();
        if (permissions.granted) {
          setIsProcessing(true);
          const directoryUri = permissions.directoryUri;
          const files = await FileSystem.StorageAccessFramework.readDirectoryAsync(directoryUri);
          
          const newItems: SelectedItem[] = [];
          
          for (const fileUri of files) {
            try {
              const info = await FileSystem.getInfoAsync(fileUri);
              if (info.exists && !info.isDirectory) {
                // Get filename from URI - SAF URIs are complex, but usually the last part is the name
                const decodedUri = decodeURIComponent(fileUri);
                let name = decodedUri.split('/').pop() || "file";
                if (name.includes(':')) {
                  name = name.split(':').pop() || name;
                }

                newItems.push({
                  id: fileUri,
                  name: name,
                  size: (info as any).size || 0,
                  type: 'file',
                  uri: fileUri,
                });
              }
            } catch (err) {
              console.warn("Error getting info for file:", fileUri, err);
            }
          }
          
          if (newItems.length > 0) {
            addItems(newItems);
            bottomSheetModalRef.current?.dismiss();
          } else {
            alert("No files found in the selected folder.");
          }
          setIsProcessing(false);
        }
      } catch (e) {
        console.error("Folder picker error:", e);
        setIsProcessing(false);
      }
    } else {
      // iOS doesn't support directory selection via SAF
      alert("Folder selection is currently optimized for Android. On iOS, please select multiple files using the 'File' option.");
      handleFilePick();
    }
  };

  const handleAppPick = () => {
    setAppPickerVisible(true);
    bottomSheetModalRef.current?.dismiss();
  };

  const SELECTION_ITEMS = [
    { label: "File", icon: "file-outline", onPress: handleFilePick },
    { label: "Media", icon: "image-outline", onPress: handleMediaPick },
    { label: "Paste", icon: "content-paste", onPress: handlePaste },
    { label: "Text", icon: "text-short", onPress: () => { setTextDialogVisible(true); bottomSheetModalRef.current?.dismiss(); } },
    { label: "Folder", icon: "folder-outline", onPress: handleFolderPick },
    { label: "App", icon: "apps", onPress: handleAppPick },
  ];

  const renderBackdrop = useCallback(
    (props: any) => (
      <BottomSheetBackdrop
        {...props}
        disappearsOnIndex={-1}
        appearsOnIndex={0}
      />
    ),
    []
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <ScrollView 
        contentContainerStyle={styles.scrollContent}
      >
        
        {/* Selection Summary Card */}
        {selectedItems.length > 0 && (
          <Card style={styles.summaryCard} mode="contained">
            <Card.Content>
              <View style={styles.summaryHeader}>
                <View>
                  <Text variant="titleLarge" style={[styles.summaryTitle, { color: theme.colors.primary }]}>Selection</Text>
                  <Text variant="bodyMedium" style={[styles.summaryStats, { color: theme.colors.onSurfaceVariant }]}>
                    Files: {selectedItems.length}
                  </Text>
                  <Text variant="bodyMedium" style={[styles.summaryStats, { color: theme.colors.onSurfaceVariant }]}>
                    Size: {formatSize(totalSize)}
                  </Text>
                </View>
                <IconButton 
                  icon="close" 
                  size={24} 
                  onPress={clearSelection} 
                  style={styles.closeButton}
                  iconColor={theme.colors.onSurfaceVariant}
                />
              </View>

              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.thumbnailList}>
                {selectedItems.map((item) => (
                  <View key={item.id} style={styles.thumbnailContainer}>
                    {item.type === 'media' && item.uri ? (
                      <RNImage source={{ uri: item.uri }} style={styles.thumbnailImage} />
                    ) : (
                      <MaterialCommunityIcons 
                        name={item.type === 'media' ? "image" : item.type === 'text' ? "text" : "file-document"} 
                        size={32} 
                        color={theme.colors.primary} 
                      />
                    )}
                    <Text variant="labelSmall" numberOfLines={1} style={[styles.thumbnailLabel, { color: theme.colors.onSurfaceVariant }]}>
                      {item.name}
                    </Text>
                  </View>
                ))}
              </ScrollView>

              <View style={styles.summaryActions}>
                <Button 
                  mode="text" 
                  onPress={() => setSelectionSheetVisible(true)} 
                  textColor={theme.colors.primary}
                  style={styles.editButton}
                >
                  Edit
                </Button>
                <View style={{ flex: 1 }} />
                <Button 
                  mode="contained" 
                  onPress={() => bottomSheetModalRef.current?.present()} 
                  icon="plus" 
                  style={styles.addButton}
                  buttonColor={theme.colors.primary}
                  textColor={theme.colors.onPrimary}
                >
                  Add
                </Button>
              </View>
            </Card.Content>
          </Card>
        )}

        {/* Selection Placeholder (when empty) */}
        {selectedItems.length === 0 && (
          <>
            <Text variant="titleMedium" style={styles.sectionTitle}>Selection</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.selectionRow}>
              {SELECTION_ITEMS.map((item, index) => (
                <Card 
                  key={index} 
                  style={styles.selectionCard} 
                  mode="contained"
                  onPress={item.onPress}
                >
                  <Card.Content style={styles.cardContent}>
                    <MaterialCommunityIcons 
                      name={item.icon as any} 
                      size={26} 
                      color={theme.colors.primary} 
                    />
                    <Text 
                      variant="labelLarge" 
                      style={[styles.cardLabel, { color: theme.colors.onSurfaceVariant }]}
                    >
                      {item.label}
                    </Text>
                  </Card.Content>
                </Card>
              ))}
            </ScrollView>
          </>
        )}

        {/* Nearby Devices Section */}
        <View style={styles.nearbyHeader}>
          <Text variant="titleMedium" style={styles.sectionTitle}>Nearby devices</Text>
          <View style={styles.nearbyActions}>
            <IconButton icon="refresh" size={20} onPress={startScanning} disabled={isScanning} />
          </View>
        </View>

        {/* Device List */}
        {sortedDevices.map((device) => {
          const isFavorite = favoriteIds.includes(device.id);
          return (
            <Card 
              key={device.id}
              style={styles.deviceCard} 
              mode="contained" 
              onPress={() => handleDevicePress(device)}
            >
              <View style={styles.deviceCardContent}>
                <MaterialCommunityIcons 
                  name={device.platform === 'mobile' ? "cellphone" : "laptop"} 
                  size={40} 
                  color={theme.colors.onSurfaceVariant} 
                  style={styles.deviceIcon} 
                />
                <View style={styles.deviceInfo}>
                  <Text variant="titleMedium">{device.name}</Text>
                  <View style={styles.badgeRow}>
                    <View style={[styles.badge, { backgroundColor: theme.colors.surfaceVariant }]}>
                      <Text variant="labelSmall">{getPortLabel(device.ip)}</Text>
                    </View>
                    <View style={[styles.badge, { backgroundColor: theme.colors.surfaceVariant }]}>
                      <Text variant="labelSmall">{device.os || device.brand || 'Station'}</Text>
                    </View>
                  </View>
                </View>
                <IconButton 
                  icon={isFavorite ? "heart" : "heart-outline"} 
                  size={24} 
                  iconColor={isFavorite ? theme.colors.primary : theme.colors.onSurfaceVariant}
                  onPress={(e) => { 
                    e.stopPropagation(); 
                    toggleFavorite(device.id);
                  }} 
                />
              </View>
            </Card>
          );
        })}

        {nearbyDevices.length === 0 && (
          <View style={styles.emptyState}>
            {!isScanning && (
              <>
                <MaterialCommunityIcons name="radar" size={48} color={theme.colors.onSurfaceDisabled} />
                <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceDisabled, marginTop: 12 }}>
                  Scanning for nearby stations...
                </Text>
              </>
            )}
          </View>
        )}

        {/* Troubleshoot Button */}
        <View style={styles.bottomSection}>
          <Button mode="contained-tonal" onPress={() => {}} style={styles.troubleshootButton}>
            Troubleshoot
          </Button>
          <Text variant="bodySmall" style={styles.hintText}>
            Please ensure that the desired target is also on the same Wi-Fi network.
          </Text>
        </View>
      </ScrollView>

      {/* Processing Dialog */}
      <Portal>
        <Dialog visible={isProcessing} dismissable={false} style={{ borderRadius: 28 }}>
          <Dialog.Title>Scanning Folder</Dialog.Title>
          <Dialog.Content>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <MaterialCommunityIcons name="folder-search-outline" size={32} color={theme.colors.primary} style={{ marginRight: 16 }} />
              <Text variant="bodyMedium">Analyzing items and preparing for transfer. This may take a moment...</Text>
            </View>
          </Dialog.Content>
        </Dialog>
      </Portal>

      {/* Text Input Dialog */}
      <Portal>
        <Dialog visible={textDialogVisible} onDismiss={() => setTextDialogVisible(false)} style={{ borderRadius: 28 }}>
          <Dialog.Title>Enter Text</Dialog.Title>
          <Dialog.Content>
            <TextInput
              label="Type something..."
              value={inputText}
              onChangeText={setInputText}
              mode="outlined"
              multiline
              numberOfLines={4}
              style={{ backgroundColor: 'transparent' }}
            />
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setTextDialogVisible(false)}>Cancel</Button>
            <Button onPress={handleAddText}>Add</Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>

      <BottomSheetModal
        ref={bottomSheetModalRef}
        index={0}
        snapPoints={snapPoints}
        enablePanDownToClose
        backdropComponent={renderBackdrop}
        backgroundStyle={{ backgroundColor: theme.colors.surface }}
        handleIndicatorStyle={{ backgroundColor: theme.colors.outline }}
      >
        <BottomSheetView style={styles.bottomSheetContent}>
          <Text variant="titleMedium" style={[styles.bsTitle, { color: theme.colors.onSurface }]}>Add selection</Text>
          <View style={styles.bsGrid}>
            {SELECTION_ITEMS.map((item, index) => (
              <View key={index} style={styles.gridItemContainer}>
                <Card 
                  style={[styles.bsCard, { backgroundColor: theme.colors.surfaceVariant }]} 
                  mode="contained"
                  onPress={item.onPress}
                >
                  <Card.Content style={styles.bsCardContent}>
                    <MaterialCommunityIcons 
                      name={item.icon as any} 
                      size={28} 
                      color={theme.colors.primary} 
                    />
                    <Text 
                      variant="labelLarge" 
                      style={[styles.bsCardLabel, { color: theme.colors.onSurfaceVariant }]}
                    >
                      {item.label}
                    </Text>
                  </Card.Content>
                </Card>
              </View>
            ))}
          </View>
        </BottomSheetView>
      </BottomSheetModal>

      <SelectionDetailsPortal 
        visible={selectionSheetVisible} 
        onDismiss={() => setSelectionSheetVisible(false)} 
      />

      <AppPickerPortal
        visible={appPickerVisible}
        onDismiss={() => setAppPickerVisible(false)}
        onSelectApps={(apps) => addItems(apps)}
      />

      <SendingPortal
        visible={sendingPortalVisible}
        onDismiss={() => setSendingPortalVisible(false)}
        targetDevice={useMemo(() => selectedDevice ? {
          name: selectedDevice.name,
          id: getPortLabel(selectedDevice.ip).replace('#', ''),
          os: selectedDevice.os || selectedDevice.brand || 'Computer',
          ip: selectedDevice.ip,
          port: selectedDevice.port || 3030,
          platform: selectedDevice.platform
        } : null, [selectedDevice])}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingVertical: 16,
  },
  sectionTitle: {
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  selectionRow: {
    paddingHorizontal: 12,
    paddingBottom: 24,
    flexDirection: "row",
  },
  selectionCard: {
    width: 100,
    height: 80,
    marginHorizontal: 6,
    borderRadius: 20,
  },
  cardContent: {
    padding: 0,
    alignItems: "center",
    justifyContent: "center",
    height: "100%",
  },
  cardLabel: {
    marginTop: 8,
    fontWeight: "500",
  },
  nearbyHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingRight: 8,
    marginTop: 8,
  },
  nearbyActions: {
    flexDirection: "row",
  },
  deviceCard: {
    marginHorizontal: 16,
    marginTop: 8,
    borderRadius: 16,
    marginBottom: 12,
  },
  deviceCardContent: {
    flexDirection: "row",
    padding: 16,
    alignItems: "center",
  },
  deviceIcon: {
    marginRight: 16,
  },
  deviceInfo: {
    flex: 1,
  },
  badgeRow: {
    flexDirection: "row",
    gap: 8,
    marginTop: 4,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  emptyState: {
    paddingVertical: 40,
    alignItems: "center",
    opacity: 0.6,
  },
  bottomSection: {
    marginTop: 40,
    alignItems: "center",
    paddingHorizontal: 40,
  },
  troubleshootButton: {
    borderRadius: 20,
    marginBottom: 24,
  },
  hintText: {
    textAlign: "center",
    opacity: 0.6,
    lineHeight: 18,
  },
  summaryCard: {
    marginHorizontal: 16,
    marginBottom: 24,
    borderRadius: 24,
    padding: 8,
    backgroundColor: 'transparent',
  },
  summaryHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  summaryTitle: {
    fontWeight: "bold",
  },
  summaryStats: {
    opacity: 0.7,
    marginTop: 2,
  },
  closeButton: {
    margin: 0,
  },
  thumbnailList: {
    marginTop: 16,
    marginBottom: 8,
  },
  thumbnailContainer: {
    alignItems: "center",
    width: 80,
    marginRight: 12,
  },
  thumbnailImage: {
    width: 48,
    height: 48,
    borderRadius: 12,
  },
  thumbnailLabel: {
    marginTop: 4,
    width: "100%",
    textAlign: "center",
    opacity: 0.7,
  },
  summaryActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    alignItems: "center",
    marginTop: 8,
    gap: 8,
  },
  editButton: {
    marginRight: 8,
  },
  addButton: {
    borderRadius: 20,
    paddingHorizontal: 8,
  },
  bottomSheetContent: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 40,
  },
  bsTitle: {
    marginBottom: 20,
    fontWeight: "bold",
    textAlign: "center",
  },
  bsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },
  gridItemContainer: {
    width: "31%",
    marginBottom: 16,
  },
  bsCard: {
    borderRadius: 20,
    height: 100,
    elevation: 0,
  },
  bsCardContent: {
    padding: 0,
    alignItems: "center",
    justifyContent: "center",
    height: "100%",
  },
  bsCardLabel: {
    marginTop: 10,
    fontSize: 13,
    fontWeight: "600",
  },
});

