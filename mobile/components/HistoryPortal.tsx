import React from "react";
import { IconButton, Text, Button, useTheme, Modal, Portal, Card } from "react-native-paper";
import { SafeAreaView } from "react-native-safe-area-context";
import { FlatList, StyleSheet, View, Platform, Linking } from "react-native";
import { useSettingsStore, HistoryItem } from "@/store/useSettingsStore";
import { MaterialCommunityIcons } from "@expo/vector-icons";

interface HistoryPortalProps {
  visible: boolean;
  onDismiss: () => void;
}

const HistoryPortal = ({ visible, onDismiss }: HistoryPortalProps) => {
  const theme = useTheme();
  const history = useSettingsStore((state) => state.transferHistory);
  const clearHistoryStore = useSettingsStore((state) => state.clearHistory);
  const saveToFolderPath = useSettingsStore((state) => state.saveToFolderPath);

  const clearHistory = async () => {
    clearHistoryStore();
  };

  const getDisplayPath = (uri: string | null) => {
    if (!uri) return "Not set (Internal)";
    if (uri.startsWith('content://')) return "Custom Folder (SAF)";
    
    // Android user-friendly path
    if (uri.includes('/storage/emulated/0/')) {
      return uri.split('/storage/emulated/0/')[1] || "Phone Storage";
    }
    
    // iOS user-friendly path
    if (uri.includes('/Documents/')) {
      const parts = uri.split('/Documents/');
      return parts[parts.length - 1] || "App Documents";
    }
    
    return uri.split('/').pop() || uri;
  };

  const openFolder = async () => {
    try {
      if (saveToFolderPath) {
        if (Platform.OS === 'android') {
          if (saveToFolderPath.startsWith('file:///storage/emulated/0/')) {
            const relativePath = saveToFolderPath.replace('file:///storage/emulated/0/', '');
            const safUri = `content://com.android.externalstorage.documents/document/primary%3A${encodeURIComponent(relativePath)}`;
            try {
              await Linking.openURL(safUri);
              return;
            } catch (e) {
               // Fallback to root
               await Linking.openURL('content://com.android.externalstorage.documents/root/primary');
               return;
            }
          }
          await Linking.openURL(saveToFolderPath);
        } else {
          await Linking.openURL(saveToFolderPath);
        }
      } else {
        // Fallback to generic shared storage or alert
        if (Platform.OS === 'android') {
          await Linking.openURL('content://com.android.externalstorage.documents/root/primary');
        } else {
          alert("Default storage is App Documents. You can see it in the Files app.");
        }
      }
    } catch (e) {
      alert("Could not open folder directly. Please use your Files / File Manager app.");
    }
  };

  const formatSize = (bytes: number) => {
    if (bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB", "TB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  const renderItem = ({ item }: { item: HistoryItem }) => (
    <Card style={styles.historyCard} mode="contained">
      <View style={styles.cardContent}>
        <View style={[styles.iconBox, { backgroundColor: theme.colors.surfaceVariant }]}>
          <MaterialCommunityIcons name="file-document-outline" size={24} color={theme.colors.primary} />
        </View>
        <View style={styles.itemInfo}>
          <Text variant="titleSmall" numberOfLines={1}>{item.name}</Text>
          <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
            {formatSize(item.size)} • {formatDate(item.timestamp)}
          </Text>
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
    <Portal>
      <Modal
        visible={visible}
        onDismiss={onDismiss}
        contentContainerStyle={[
          styles.modalContainer,
          { backgroundColor: theme.colors.background }
        ]}
      >
        <SafeAreaView style={styles.safeArea} edges={['bottom']}>
          <View style={styles.container}>
            {/* App Bar / Header */}
            <View style={[styles.appBar, { marginTop: Platform.OS === 'android' ? 8 : 0 }]}>
              <IconButton
                icon="arrow-left"
                size={24}
                onPress={onDismiss}
                iconColor={theme.colors.onSurface}
              />
              <Text variant="headlineSmall" style={[styles.title, { color: theme.colors.onSurface }]}>
                History
              </Text>
            </View>

            {/* Action Buttons Row */}
            <View style={styles.buttonRow}>
              <Button
                mode="contained-tonal"
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
                buttonColor={theme.colors.errorContainer}
                textColor={theme.colors.onErrorContainer}
              >
                Clear
              </Button>
            </View>

            {/* Storage Info */}
            <View style={styles.storageInfo}>
              <MaterialCommunityIcons name="folder" size={16} color={theme.colors.onSurfaceVariant} />
              <Text variant="labelMedium" style={[styles.storageText, { color: theme.colors.onSurfaceVariant }]}>
                Saving to: <Text style={{ fontWeight: 'bold' }}>{getDisplayPath(saveToFolderPath)}</Text>
              </Text>
            </View>

            {/* Content */}
            <View style={styles.content}>
              {history.length > 0 ? (
                <FlatList
                  data={[...history].reverse()} // Show newest first
                  renderItem={renderItem}
                  keyExtractor={(item) => item.id}
                  contentContainerStyle={styles.listContent}
                  showsVerticalScrollIndicator={false}
                />
              ) : (
                <View style={styles.emptyContainer}>
                  <MaterialCommunityIcons name="history" size={64} color={theme.colors.onSurfaceDisabled} />
                  <Text variant="headlineSmall" style={[styles.emptyText, { color: theme.colors.onSurfaceVariant }]}>
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
  appBar: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 4,
    height: 44,
  },
  title: {
    marginLeft: 8,
    fontWeight: "400",
  },
  buttonRow: {
    flexDirection: "row",
    paddingHorizontal: 16,
    gap: 12,
    marginTop: 0,
  },
  actionButton: {
    flex: 1,
    borderRadius: 20,
  },
  buttonContent: {
    height: 48,
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
    opacity: 0.8,
  },
  storageText: {
    fontSize: 12,
  },
  content: {
    flex: 1,
    paddingTop: 16,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 24,
  },
  historyCard: {
    marginBottom: 8,
    borderRadius: 16,
  },
  cardContent: {
    flexDirection: "row",
    padding: 12,
    alignItems: "center",
  },
  iconBox: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  itemInfo: {
    flex: 1,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingBottom: 80,
  },
  emptyText: {
    opacity: 0.7,
    fontWeight: "600",
    marginTop: 16,
  },
});

export default HistoryPortal;
