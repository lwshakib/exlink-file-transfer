import React, { useState, useCallback, useRef, useMemo, useEffect } from 'react';
import { StyleSheet, View, ScrollView, Platform, Image as RNImage, Animated, TouchableOpacity, RefreshControl, ActivityIndicator, InteractionManager } from 'react-native';
import {
  Text,
  IconButton,
  useTheme,
  Card,
  Button,
  Portal,
  Dialog,
  TextInput,
} from '@/components/ui';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import * as ExpoImagePicker from 'expo-image-picker';
import * as ExpoClipboard from 'expo-clipboard';
import { BottomSheetModal, BottomSheetView, BottomSheetBackdrop } from '@gorhom/bottom-sheet';

import { useSelection, SelectedItem } from '@/hooks/useSelection';
import SelectionDetailsPortal from '@/components/SelectionDetailsPortal';
import SendingPortal from '@/components/SendingPortal';
import AppPickerPortal from '@/components/AppPickerPortal';
import * as FileSystem from 'expo-file-system/legacy';

import AsyncStorage from '@react-native-async-storage/async-storage';
import { useDiscoveryStore, NearbyDevice } from '@/store/useDiscoveryStore';

const getOSIcon = (os?: string) => {
  const clean = (os || '').toLowerCase();
  if (clean.includes('windows')) return 'microsoft-windows';
  if (clean.includes('android')) return 'android';
  if (clean.includes('ios') || clean.includes('mac') || clean.includes('apple')) return 'apple';
  if (clean.includes('linux')) return 'linux';
  return 'responsive';
};

const getPortLabel = (id: string) => {
  if (!id) return '';
  if (id.includes('.')) {
    const parts = id.split('.');
    return `#${parts[parts.length - 1]}`;
  }
  return `#${id.slice(-3)}`;
};

// Main interface for selecting documents, resolving targets, and initiating transfers
export default function SendScreen() {
  // Global hooks integrating router and UI styling
  const theme = useTheme();

  // Custom hook bringing out universal actions operating across the shared queue
  const { selectedItems, addItems, clearSelection, totalSize } = useSelection();

  // Settings Store
  // Removed unused deviceName and deviceId

  // Discovery Store
  const nearbyDevices = useDiscoveryStore((state) => state.nearbyDevices);
  const isScanning = useDiscoveryStore((state) => state.isScanning);
  const triggerScan = useDiscoveryStore((state) => state.triggerScan);

  const scannerPulse = useRef(new Animated.Value(0.4)).current;

  useEffect(() => {
    if (isScanning) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(scannerPulse, {
            toValue: 1.0,
            duration: 1200,
            useNativeDriver: true,
          }),
          Animated.timing(scannerPulse, {
            toValue: 0.4,
            duration: 1200,
            useNativeDriver: true,
          }),
        ])
      ).start();
    } else {
      scannerPulse.setValue(0.4);
    }
  }, [isScanning]);

  const [textDialogVisible, setTextDialogVisible] = useState(false);
  const [inputText, setInputText] = useState('');
  const [favoriteIds, setFavoriteIds] = useState<string[]>([]);

  // Bottom sheet API reference allowing programmatic invocation
  const bottomSheetModalRef = useRef<BottomSheetModal>(null);

  // Modals visibility toggles mapped securely strictly to boolean paths
  const [selectionSheetVisible, setSelectionSheetVisible] = useState(false);
  const [sendingPortalVisible, setSendingPortalVisible] = useState(false);
  const [appPickerVisible, setAppPickerVisible] = useState(false);

  // Track specifically chosen target locally before invoking connection attempts
  const [selectedDevice, setSelectedDevice] = useState<NearbyDevice | null>(null);

  // Hoisted useMemo to avoid Rules of Hooks violation when portals are conditionally rendered
  const sendingTargetDevice = useMemo(
    () =>
      selectedDevice
        ? {
            name: selectedDevice.name,
            id: getPortLabel(selectedDevice.ip).replace('#', ''),
            os: selectedDevice.os || selectedDevice.brand || 'Computer',
            ip: selectedDevice.ip,
            port: selectedDevice.port || 3030,
            platform: selectedDevice.platform,
          }
        : null,
    [selectedDevice]
  );

  // Heavy operation blocking flag (like opening large SAF folders on older droids)
  const [isProcessing, setIsProcessing] = useState(false);

  // UI scaling anchors forcing sheet popups precisely partially offscreen
  const snapPoints = useMemo(() => ['45%'], []);
  
  // Deferment state ensuring tabs render structurally instantly before spinning up JS heavy rendering
  const [isReady, setIsReady] = useState(false);

  // Hook booting component immediately trying to find old user preferences asynchronously
  useEffect(() => {
    const task = InteractionManager.runAfterInteractions(() => {
      setIsReady(true);
      loadFavorites();
    });
    return () => task.cancel();
  }, []);

  const loadFavorites = async () => {
    try {
      const stored = await AsyncStorage.getItem('favoriteDeviceIds');
      if (stored) {
        setFavoriteIds(JSON.parse(stored));
      }
    } catch {}
  };

  const toggleFavorite = async (deviceId: string) => {
    try {
      const nextFavorites = favoriteIds.includes(deviceId)
        ? favoriteIds.filter((id) => id !== deviceId)
        : [...favoriteIds, deviceId];

      setFavoriteIds(nextFavorites);
      await AsyncStorage.setItem('favoriteDeviceIds', JSON.stringify(nextFavorites));
    } catch {}
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

  // Fire forced explicit backend subnet sweeping when specifically asked by UI taps
  const startScanning = async () => {
    triggerScan();
  };

  // Connection proxy: checks logic to ensure payload isn't dead before showing connecting overlays
  const handleDevicePress = async (device: NearbyDevice) => {
    // Failsafe guarding empty clicks
    if (selectedItems.length === 0) {
      alert('Please select at least one item to share before connecting.');
      return;
    }

    setSelectedDevice(device);
    setSendingPortalVisible(true);
  };

  const formatSize = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  // Re-routes Android intents explicitly towards generic documents abstracting formats entirely
  const handleFilePick = async () => {
    try {
      // System hook fetching general OS documents gracefully
      const result = await DocumentPicker.getDocumentAsync({
        multiple: true,
        type: '*/*',
      });

      if (!result.canceled) {
        // Build internal memory objects satisfying our type shapes avoiding TS errors
        const newItems: SelectedItem[] = result.assets.map((asset) => ({
          id: asset.uri,
          name: asset.name,
          size: asset.size || 0,
          type: 'file',
          uri: asset.uri,
          mimeType: asset.mimeType || 'application/octet-stream',
        }));

        // Feed generated array back upward broadly across application store
        addItems(newItems);
        bottomSheetModalRef.current?.dismiss();
      }
    } catch (err) {
      console.error('Error picking document:', err);
    }
  };

  const handleMediaPick = async () => {
    try {
      const result = await ExpoImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images', 'videos'],
        allowsMultipleSelection: true,
      });

      if (!result.canceled) {
        const newItems: SelectedItem[] = result.assets.map((asset) => ({
          id: asset.uri,
          name: asset.fileName || asset.uri.split('/').pop() || 'media',
          size: asset.fileSize || 0,
          type: 'media',
          uri: asset.uri,
          mimeType: asset.mimeType || (asset.type === 'video' ? 'video/mp4' : 'image/jpeg'),
        }));
        addItems(newItems);
        bottomSheetModalRef.current?.dismiss();
      }
    } catch (err) {
      console.error('Error picking media:', err);
    }
  };

  const handlePaste = async () => {
    const text = await ExpoClipboard.getStringAsync();
    if (text) {
      const newItem: SelectedItem = {
        id: `paste-${Date.now()}`,
        name: 'Pasted Text',
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
        name: 'Text Content',
        size: inputText.length,
        type: 'text',
        content: inputText,
      };
      addItems([newItem]);
      setInputText('');
      setTextDialogVisible(false);
      bottomSheetModalRef.current?.dismiss();
    }
  };

  const handleFolderPick = async () => {
    if (Platform.OS === 'android') {
      try {
        const permissions =
          await FileSystem.StorageAccessFramework.requestDirectoryPermissionsAsync();
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
                let name = decodedUri.split('/').pop() || 'file';
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
              console.warn('Error getting info for file:', fileUri, err);
            }
          }

          if (newItems.length > 0) {
            addItems(newItems);
            bottomSheetModalRef.current?.dismiss();
          } else {
            alert('No files found in the selected folder.');
          }
          setIsProcessing(false);
        }
      } catch (e) {
        console.error('Folder picker error:', e);
        setIsProcessing(false);
      }
    } else {
      // iOS doesn't support directory selection via SAF
      alert(
        "Folder selection is currently optimized for Android. On iOS, please select multiple files using the 'File' option."
      );
      handleFilePick();
    }
  };

  const handleAppPick = () => {
    setAppPickerVisible(true);
    bottomSheetModalRef.current?.dismiss();
  };

  const SELECTION_ITEMS = [
    { label: 'File', icon: 'file-outline', onPress: handleFilePick },
    { label: 'Media', icon: 'image-outline', onPress: handleMediaPick },
    { label: 'Paste', icon: 'content-paste', onPress: handlePaste },
    {
      label: 'Text',
      icon: 'text-short',
      onPress: () => {
        setTextDialogVisible(true);
        bottomSheetModalRef.current?.dismiss();
      },
    },
    { label: 'Folder', icon: 'folder-outline', onPress: handleFolderPick },
    { label: 'App', icon: 'apps', onPress: handleAppPick },
  ];

  const renderBackdrop = useCallback(
    (props: any) => <BottomSheetBackdrop {...props} disappearsOnIndex={-1} appearsOnIndex={0} />,
    []
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={false}
            onRefresh={startScanning}
            colors={[theme.colors.primary]}
            tintColor={theme.colors.primary}
            progressBackgroundColor={theme.colors.surface}
          />
        }
      >
        {/* Selection Summary Card: Dynamically mounted only if actual items exist in state */}
        {selectedItems.length > 0 && (
          <Card
            style={[
              styles.summaryCard,
              {
                backgroundColor: theme.colors.surface,
                borderColor: theme.colors.outlineVariant,
              },
            ]}
            mode="contained"
          >
            <Card.Content>
              {/* Top grouping binding string labels safely pushing metrics */}
              <View style={styles.summaryHeader}>
                <View>
                  <Text
                    variant="titleLarge"
                    style={[styles.summaryTitle, { color: theme.colors.primary }]}
                  >
                    Selection
                  </Text>
                  <Text
                    variant="bodyMedium"
                    style={[styles.summaryStats, { color: theme.colors.onSurfaceVariant }]}
                  >
                    Files: {selectedItems.length}
                  </Text>
                  <Text
                    variant="bodyMedium"
                    style={[styles.summaryStats, { color: theme.colors.onSurfaceVariant }]}
                  >
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

              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={styles.thumbnailList}
              >
                {selectedItems.map((item) => (
                  <View key={item.id} style={styles.thumbnailContainer}>
                    {item.type === 'media' && item.uri ? (
                      <RNImage source={{ uri: item.uri }} style={styles.thumbnailImage} />
                    ) : (
                      <View
                        style={[
                          styles.thumbnailFallback,
                          {
                            backgroundColor: theme.colors.surfaceVariant,
                            borderColor: theme.colors.outlineVariant,
                          },
                        ]}
                      >
                        <MaterialCommunityIcons
                          name={
                            item.type === 'media'
                              ? 'image'
                              : item.type === 'text'
                                ? 'text'
                                : 'file-document'
                          }
                          size={24}
                          color={theme.colors.primary}
                        />
                      </View>
                    )}
                    <Text
                      variant="labelSmall"
                      numberOfLines={1}
                      style={[styles.thumbnailLabel, { color: theme.colors.onSurfaceVariant }]}
                    >
                      {item.name}
                    </Text>
                  </View>
                ))}
              </ScrollView>

              <View style={styles.summaryActions}>
                <Button
                  mode="contained-tonal"
                  onPress={() => setSelectionSheetVisible(true)}
                  textColor={theme.colors.onSecondaryContainer}
                  buttonColor={theme.colors.secondaryContainer}
                  style={styles.actionButton}
                  contentStyle={styles.actionButtonContent}
                  labelStyle={styles.actionButtonLabel}
                >
                  Edit
                </Button>
                <View style={{ flex: 1 }} />
                <Button
                  mode="contained"
                  onPress={() => bottomSheetModalRef.current?.present()}
                  icon="plus"
                  style={styles.actionButton}
                  contentStyle={styles.actionButtonContent}
                  labelStyle={styles.actionButtonLabel}
                  buttonColor={theme.colors.primary}
                  textColor={theme.colors.onPrimary}
                >
                  Add
                </Button>
              </View>
            </Card.Content>
          </Card>
        )}

        {/* Horizontal categories carousel (when empty) */}
        {selectedItems.length === 0 && (
          <View style={styles.carouselSection}>
            <Text variant="titleMedium" style={styles.carouselSectionTitle}>
              Select content to send
            </Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.carouselContainer}
            >
              {SELECTION_ITEMS.map((item, index) => (
                <TouchableOpacity
                  key={index}
                  style={[
                    styles.carouselItem,
                    {
                      backgroundColor: theme.colors.surfaceVariant,
                    },
                  ]}
                  onPress={item.onPress}
                  activeOpacity={0.7}
                >
                  <View
                    style={[
                      styles.carouselIconCircle,
                      { backgroundColor: 'transparent' },
                    ]}
                  >
                    <MaterialCommunityIcons
                      name={item.icon as any}
                      size={24}
                      color={theme.colors.primary}
                    />
                  </View>
                  <Text
                    variant="labelMedium"
                    style={[styles.carouselItemLabel, { color: theme.colors.onSurface }]}
                  >
                    {item.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}

        {/* Nearby Devices Section */}
        <View style={styles.nearbyHeader}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Text variant="titleMedium" style={[styles.sectionTitle, { marginBottom: 0 }]}>
              Nearby Devices
            </Text>
          </View>
          <View style={styles.nearbyActions}>
            {isScanning ? (
              <ActivityIndicator size="small" color={theme.colors.primary} style={{ margin: 12 }} />
            ) : (
              <IconButton icon="refresh" size={22} onPress={startScanning} disabled={isScanning} />
            )}
          </View>
        </View>

        {/* Device List */}
        {sortedDevices.map((device) => {
          const isFavorite = favoriteIds.includes(device.id);
          return (
            <TouchableOpacity
              key={device.id}
              style={[
                styles.deviceContainer,
                {
                  backgroundColor: theme.colors.surface,
                  shadowColor: '#000',
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.05,
                  shadowRadius: 8,
                  elevation: 2,
                },
              ]}
              onPress={() => handleDevicePress(device)}
              activeOpacity={0.8}
            >
              <View style={styles.deviceCardContent}>
                <View style={{ position: 'relative' }}>
                  <View
                    style={[
                      styles.deviceAvatarBadge,
                      {
                        backgroundColor: isFavorite ? theme.colors.primaryContainer : theme.colors.elevation.level2,
                        marginRight: 16,
                      },
                    ]}
                  >
                    <MaterialCommunityIcons
                      name={device.platform === 'mobile' ? 'cellphone' : 'laptop'}
                      size={24}
                      color={isFavorite ? theme.colors.primary : theme.colors.onSurfaceVariant}
                    />
                  </View>
                </View>
                <View style={styles.deviceInfo}>
                  <Text variant="titleMedium" style={{ fontWeight: '700', color: theme.colors.onSurface }}>{device.name}</Text>
                  <View style={styles.badgeRow}>
                    <View
                      style={[
                        styles.badge,
                        {
                          backgroundColor: theme.colors.primaryContainer,
                          flexDirection: 'row',
                          alignItems: 'center',
                          paddingHorizontal: 8,
                          paddingVertical: 3,
                          borderRadius: 8,
                        },
                      ]}
                    >
                      <MaterialCommunityIcons name="lan" size={12} color={theme.colors.onPrimaryContainer} style={{ marginRight: 4 }} />
                      <Text variant="labelSmall" style={{ color: theme.colors.onPrimaryContainer, fontWeight: '700', fontSize: 10 }}>
                        {getPortLabel(device.ip)}
                      </Text>
                    </View>
                    <View
                      style={[
                        styles.badge,
                        {
                          backgroundColor: theme.colors.surfaceVariant,
                          flexDirection: 'row',
                          alignItems: 'center',
                          paddingHorizontal: 8,
                          paddingVertical: 3,
                          borderRadius: 8,
                        },
                      ]}
                    >
                      <MaterialCommunityIcons
                        name={getOSIcon(device.os) as any}
                        size={12}
                        color={theme.colors.onSurfaceVariant}
                        style={{ marginRight: 4 }}
                      />
                      <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant, fontWeight: '700', fontSize: 10 }}>
                        {device.os || device.brand || 'Station'}
                      </Text>
                    </View>
                  </View>
                </View>
                <IconButton
                  icon={isFavorite ? 'heart' : 'heart-outline'}
                  size={24}
                  iconColor={isFavorite ? theme.colors.primary : theme.colors.onSurfaceVariant}
                  onPress={(e: any) => {
                    e.stopPropagation();
                    toggleFavorite(device.id);
                  }}
                />
              </View>
            </TouchableOpacity>
          );
        })}

        {nearbyDevices.length === 0 && (
          <View style={styles.emptyState}>
            {!isScanning ? (
              <>
                <MaterialCommunityIcons
                  name="devices"
                  size={48}
                  color={theme.colors.onSurfaceVariant}
                />
                <Text
                  variant="bodyMedium"
                  style={{ color: theme.colors.onSurfaceVariant, marginTop: 12 }}
                >
                  No nearby devices found.
                </Text>
              </>
            ) : (
              <>
                <MaterialCommunityIcons
                  name="radar"
                  size={48}
                  color={theme.colors.onSurfaceVariant}
                />
                <Text
                  variant="bodyMedium"
                  style={{ color: theme.colors.onSurfaceVariant, marginTop: 12 }}
                >
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
              <MaterialCommunityIcons
                name="folder-search-outline"
                size={32}
                color={theme.colors.primary}
                style={{ marginRight: 16 }}
              />
              <Text variant="bodyMedium">
                Analyzing items and preparing for transfer. This may take a moment...
              </Text>
            </View>
          </Dialog.Content>
        </Dialog>
      </Portal>

      {/* Text Input Dialog */}
      <Portal>
        <Dialog
          visible={textDialogVisible}
          onDismiss={() => setTextDialogVisible(false)}
          style={{ borderRadius: 28 }}
        >
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
          <Text variant="titleMedium" style={[styles.bsTitle, { color: theme.colors.onSurface }]}>
            Add selection
          </Text>
          <View style={styles.bsGrid}>
            {SELECTION_ITEMS.map((item, index) => (
              <View key={index} style={styles.gridItemContainer}>
                <TouchableOpacity onPress={item.onPress} activeOpacity={0.75}>
                  <Card
                    style={[styles.bsCard, { backgroundColor: theme.colors.surfaceVariant }]}
                    mode="contained"
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
                </TouchableOpacity>
              </View>
            ))}
          </View>
        </BottomSheetView>
      </BottomSheetModal>

      {isReady && (
        <>
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
            targetDevice={sendingTargetDevice}
          />
        </>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingTop: 16,
    paddingBottom: 110,
  },
  sectionTitle: {
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  nearbyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingRight: 8,
    marginTop: 8,
  },
  nearbyActions: {
    flexDirection: 'row',
  },
  deviceCardContent: {
    flexDirection: 'row',
    padding: 16,
    alignItems: 'center',
  },
  deviceAvatarBadge: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  activeIndicatorDot: {
    position: 'absolute',
    bottom: -2,
    right: 14,
    width: 14,
    height: 14,
    borderRadius: 7,
  },
  activeScanningBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
    gap: 4,
  },
  scanningIndicatorDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  scanningBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  bsTitle: {
    marginBottom: 20,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  bsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  gridItemContainer: {
    width: '31%',
    marginBottom: 16,
  },
  bsCard: {
    borderRadius: 20,
    height: 100,
    elevation: 0,
  },
  bsCardContent: {
    padding: 0,
    alignItems: 'center',
    justifyContent: 'center',
    height: '100%',
  },
  bsCardLabel: {
    marginTop: 10,
    fontSize: 13,
    fontWeight: '600',
  },
  summaryCard: {
    marginHorizontal: 16,
    marginBottom: 24,
    borderRadius: 24,
    padding: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  summaryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  summaryTitle: {
    fontWeight: 'bold',
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
    alignItems: 'center',
    width: 80,
    marginRight: 12,
  },
  thumbnailImage: {
    width: 48,
    height: 48,
    borderRadius: 12,
  },
  thumbnailFallback: {
    width: 48,
    height: 48,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  thumbnailLabel: {
    marginTop: 4,
    width: '100%',
    textAlign: 'center',
    opacity: 0.7,
  },
  summaryActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    marginTop: 8,
    gap: 8,
  },
  actionButton: {
    borderRadius: 12,
    minWidth: 92,
  },
  actionButtonContent: {
    height: 40,
    paddingHorizontal: 10,
  },
  actionButtonLabel: {
    fontSize: 14,
    fontWeight: '600',
  },
  carouselSection: {
    marginBottom: 20,
  },
  carouselSectionTitle: {
    fontWeight: 'bold',
    marginBottom: 12,
    opacity: 0.8,
    paddingHorizontal: 16,
  },
  carouselContainer: {
    gap: 12,
    paddingHorizontal: 16,
  },
  carouselItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
    gap: 8,
  },
  carouselIconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  carouselItemLabel: {
    fontWeight: '600',
    fontSize: 13,
  },
  deviceContainer: {
    marginHorizontal: 16,
    marginTop: 8,
    borderRadius: 20,
    marginBottom: 12,
  },
  deviceInfo: {
    flex: 1,
  },
  badgeRow: {
    flexDirection: 'row',
    gap: 6,
    marginTop: 4,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 32,
  },
  bottomSection: {
    alignItems: 'center',
    marginTop: 24,
    paddingHorizontal: 16,
  },
  troubleshootButton: {
    width: '100%',
    borderRadius: 12,
    marginBottom: 8,
  },
  hintText: {
    textAlign: 'center',
    opacity: 0.6,
  },
  bottomSheetContent: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 24,
  },
});

