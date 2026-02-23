import React from 'react';
import { IconButton, Text, Button, useTheme, Modal, Portal, Card } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { FlatList, StyleSheet, View, Platform, Linking } from 'react-native';
import { useSettingsStore, HistoryItem } from '@/store/useSettingsStore';
import { MaterialCommunityIcons } from '@expo/vector-icons';

// Interface defining the props expected by the HistoryPortal component
interface HistoryPortalProps {
  visible: boolean; // Determines if the portal should be rendered visible
  onDismiss: () => void; // Function to trigger when user wants to close the portal
}

// HistoryPortal component displays a full-screen modal showing past file transfers
const HistoryPortal = ({ visible, onDismiss }: HistoryPortalProps) => {
  // Access global theme configuration from React Native Paper
  const theme = useTheme();

  // Extract specific state slices and actions from our Zustand settings store
  const history = useSettingsStore((state) => state.transferHistory); // Get the array of past transfers
  const clearHistoryStore = useSettingsStore((state) => state.clearHistory); // Get the function to erase all history
  const saveToFolderPath = useSettingsStore((state) => state.saveToFolderPath); // Get the saved default folder path

  // Function called to wipe out the transfer history
  const clearHistory = async () => {
    // Calls the zustand store action which also updates local storage automatically
    clearHistoryStore();
  };

  // Helper function to format the raw URI into something user-readable
  const getDisplayPath = (uri: string | null) => {
    // If there is no URI set, the app defaults to its own internal storage space
    if (!uri) return 'Not set (Internal)';

    // Abstract Android Storage Access Framework URIs to a simpler term
    if (uri.startsWith('content://')) return 'Custom Folder (SAF)';

    // Formatting for Android's main shared storage partition
    if (uri.includes('/storage/emulated/0/')) {
      return uri.split('/storage/emulated/0/')[1] || 'Phone Storage';
    }

    // Formatting for iOS standard Documents directory
    if (uri.includes('/Documents/')) {
      const parts = uri.split('/Documents/');
      return parts[parts.length - 1] || 'App Documents';
    }

    // Fallback: Just return the last segment of the path or the URI itself
    return uri.split('/').pop() || uri;
  };

  // Function to request the OS to open the destination folder natively
  const openFolder = async () => {
    try {
      if (saveToFolderPath) {
        if (Platform.OS === 'android') {
          // If the path is a raw file path, attempt to map it to a SAF intent so that file managers can open it
          if (saveToFolderPath.startsWith('file:///storage/emulated/0/')) {
            const relativePath = saveToFolderPath.replace('file:///storage/emulated/0/', '');
            const safUri = `content://com.android.externalstorage.documents/document/primary%3A${encodeURIComponent(relativePath)}`;
            try {
              // Try directly opening that specific deeper URI
              await Linking.openURL(safUri);
              return;
            } catch (e) {
              // Fallback to opening the root directory if the specific folder fails
              await Linking.openURL('content://com.android.externalstorage.documents/root/primary');
              return;
            }
          }
          // If it isn't an emulated path, try directly
          await Linking.openURL(saveToFolderPath);
        } else {
          // Open URL natively in iOS
          await Linking.openURL(saveToFolderPath);
        }
      } else {
        // Fallback behavior when the user has never explicitly picked a folder
        if (Platform.OS === 'android') {
          // Opens the root file manager on modern Android
          await Linking.openURL('content://com.android.externalstorage.documents/root/primary');
        } else {
          // On iOS, no custom link is needed, they inspect via the 'Files' app
          alert('Default storage is App Documents. You can see it in the Files app.');
        }
      }
    } catch (e) {
      // General error catch in case no app can handle the Linking request
      alert('Could not open folder directly. Please use your Files / File Manager app.');
    }
  };

  // Helper utility to convert a raw byte number into human-readable strings (KB, MB, GB, etc.)
  const formatSize = (bytes: number) => {
    if (bytes === 0) return '0 B'; // Base case
    const k = 1024; // Base multiple for byte sizes
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB']; // Suffixes array
    // Compute the log to figure out which array index matches the magnitude
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    // Format to 1 decimal place and append the correct suffix
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  // Helper utility to convert Unix timestamp to localized string format
  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString([], {
      month: 'short', // "Jan", "Feb"
      day: 'numeric', // "1", "2"
      hour: '2-digit', // "03", "11"
      minute: '2-digit', // "05", "59"
    });
  };

  // Callback mapping properties for each item rendered by the FlatList
  const renderItem = ({ item }: { item: HistoryItem }) => (
    <Card style={styles.historyCard} mode="contained">
      <View style={styles.cardContent}>
        {/* Visual file icon badge, using theme dependent color */}
        <View style={[styles.iconBox, { backgroundColor: theme.colors.surfaceVariant }]}>
          <MaterialCommunityIcons
            name="file-document-outline"
            size={24}
            color={theme.colors.primary}
          />
        </View>

        {/* Text information column displaying file name, details from, and size */}
        <View style={styles.itemInfo}>
          <Text variant="titleSmall" numberOfLines={1}>
            {item.name}
          </Text>
          <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
            {formatSize(item.size)} • {formatDate(item.timestamp)}
          </Text>
          {/* Conditional rendering depending on if we recorded a sender identity */}
          {item.from && (
            <Text variant="labelSmall" style={{ color: theme.colors.primary, marginTop: 2 }}>
              From: {item.from}
            </Text>
          )}
        </View>
      </View>
    </Card>
  );

  return (
    // Render Modal within a Portal so it layers natively on top
    <Portal>
      <Modal
        visible={visible}
        onDismiss={onDismiss}
        contentContainerStyle={[
          styles.modalContainer,
          { backgroundColor: theme.colors.background }, // Themed modal background
        ]}
      >
        {/* Enforce spacing around edge insets including notch or home bar */}
        <SafeAreaView style={styles.safeArea} edges={['bottom']}>
          <View style={styles.container}>
            {/* App Bar / Header Section connecting close icon to title */}
            <View style={[styles.appBar, { marginTop: Platform.OS === 'android' ? 8 : 0 }]}>
              <IconButton
                icon="arrow-left"
                size={24}
                onPress={onDismiss}
                iconColor={theme.colors.onSurface}
              />
              <Text
                variant="headlineSmall"
                style={[styles.title, { color: theme.colors.onSurface }]}
              >
                History
              </Text>
            </View>

            {/* Action Buttons Row for Folder Open and History Clear */}
            <View style={styles.buttonRow}>
              <Button
                mode="contained-tonal" // Subdued surface visual mode
                icon="folder-open"
                onPress={openFolder}
                style={styles.actionButton}
                contentStyle={styles.buttonContent}
                labelStyle={styles.buttonLabel}
              >
                Open folder
              </Button>
              <Button
                mode="contained-tonal"
                icon="delete"
                onPress={clearHistory}
                style={styles.actionButton}
                contentStyle={styles.buttonContent}
                labelStyle={styles.buttonLabel}
                buttonColor={theme.colors.errorContainer} // Force error styling to indicate destructive action
                textColor={theme.colors.onErrorContainer}
              >
                Clear
              </Button>
            </View>

            {/* Storage path summary display to show where files go */}
            <View style={styles.storageInfo}>
              <MaterialCommunityIcons
                name="folder"
                size={16}
                color={theme.colors.onSurfaceVariant}
              />
              <Text
                variant="labelMedium"
                style={[styles.storageText, { color: theme.colors.onSurfaceVariant }]}
              >
                Saving to:{' '}
                <Text style={{ fontWeight: 'bold' }}>{getDisplayPath(saveToFolderPath)}</Text>
              </Text>
            </View>

            {/* List Content Area: Render items if they exist, otherwise show empty state */}
            <View style={styles.content}>
              {history.length > 0 ? (
                // Use FlatList because it optimally maps arrays handling scroll virtualization
                <FlatList
                  data={[...history].reverse()} // Duplicate to avert shallow bugs, reverse to put the newest files physically on top
                  renderItem={renderItem} // The component responsible for drawing rows
                  keyExtractor={(item) => item.id} // Essential for React diffing identity
                  contentContainerStyle={styles.listContent}
                  showsVerticalScrollIndicator={false} // Clean look lacking scroll bars
                />
              ) : (
                // Rendered empty center graphic when no array items exist
                <View style={styles.emptyContainer}>
                  <MaterialCommunityIcons
                    name="history"
                    size={64}
                    color={theme.colors.onSurfaceDisabled}
                  />
                  <Text
                    variant="headlineSmall"
                    style={[styles.emptyText, { color: theme.colors.onSurfaceVariant }]}
                  >
                    No transfers yet
                  </Text>
                </View>
              )}
            </View>
          </View>
        </SafeAreaView>
      </Modal>
    </Portal>
  );
};

// UI Styles for History Portal defined here
const styles = StyleSheet.create({
  modalContainer: {
    flex: 1, // Utilize full available bounds
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
  appBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 4,
    height: 44,
  },
  title: {
    marginLeft: 8,
    fontWeight: '400',
  },
  buttonRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    gap: 12, // Native spacing between the internal action buttons
    marginTop: 0,
  },
  actionButton: {
    flex: 1, // Share flex width 50/50
    borderRadius: 20,
  },
  buttonContent: {
    height: 48, // Standardize touch targets
  },
  buttonLabel: {
    fontSize: 14,
  },
  storageInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginTop: 12,
    gap: 6,
    opacity: 0.8, // Slightly softer opacity indicates contextual text
  },
  storageText: {
    fontSize: 12,
  },
  content: {
    flex: 1, // Fills all leftover container space
    paddingTop: 16,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 24, // Clearances around bottom screen parts
  },
  historyCard: {
    marginBottom: 8,
    borderRadius: 16,
  },
  cardContent: {
    flexDirection: 'row',
    padding: 12,
    alignItems: 'center', // Centers items along the cross axis
  },
  iconBox: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  itemInfo: {
    flex: 1, // Auto takes available string-width space
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingBottom: 80, // Bump icon up visually from dead-center
  },
  emptyText: {
    opacity: 0.7,
    fontWeight: '600',
    marginTop: 16,
  },
});

export default HistoryPortal;
