import React from "react";
import { StyleSheet, View, ScrollView, Image as RNImage, Platform } from "react-native";
import { Text, IconButton, useTheme, Card, Button, Modal, Portal } from "react-native-paper";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useSelection } from "@/hooks/useSelection";
import { SafeAreaView } from "react-native-safe-area-context";

interface SelectionDetailsPortalProps {
  visible: boolean;
  onDismiss: () => void;
}

const SelectionDetailsPortal = ({ visible, onDismiss }: SelectionDetailsPortalProps) => {
  const theme = useTheme();
  const { selectedItems, removeItem, clearSelection, totalSize } = useSelection();

  const formatSize = (bytes: number) => {
    if (bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB", "TB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'media': return 'image-outline';
      case 'text': return 'text-short';
      case 'app': return 'apps';
      case 'folder': return 'folder-outline';
      default: return 'file-outline';
    }
  };

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
                Selection
              </Text>
            </View>

            {/* Action Buttons Row */}
            <View style={styles.buttonRow}>
              <View style={styles.statsInfo}>
                <Text variant="bodyLarge" style={{ color: theme.colors.onSurface }}>
                  {selectedItems.length} items ({formatSize(totalSize)})
                </Text>
              </View>
              <Button
                mode="contained-tonal"
                icon="delete-sweep"
                onPress={clearSelection}
                style={styles.clearButton}
                contentStyle={styles.buttonContent}
                labelStyle={styles.buttonLabel}
                disabled={selectedItems.length === 0}
              >
                Clear all
              </Button>
            </View>

            <ScrollView contentContainerStyle={styles.listContent} style={styles.scrollView}>
              {selectedItems.map((item) => (
                <Card key={item.id} style={styles.itemCard} mode="contained">
                  <View style={styles.itemRow}>
                    <View style={styles.thumbnailWrapper}>
                      {item.type === 'media' && item.uri ? (
                        <RNImage source={{ uri: item.uri }} style={styles.thumbnail} />
                      ) : (
                        <View style={[styles.iconPlaceholder, { backgroundColor: theme.colors.surfaceVariant }]}>
                          <MaterialCommunityIcons name={getIcon(item.type) as any} size={28} color={theme.colors.primary} />
                        </View>
                      )}
                    </View>
                    
                    <View style={styles.itemInfo}>
                      <Text variant="bodyLarge" numberOfLines={1} style={[styles.itemName, { color: theme.colors.onSurface }]}>{item.name}</Text>
                      <Text variant="labelMedium" style={[styles.itemSize, { color: theme.colors.onSurfaceVariant }]}>{formatSize(item.size)}</Text>
                    </View>

                    <IconButton icon="close" size={20} onPress={() => removeItem(item.id)} iconColor={theme.colors.onSurfaceVariant} />
                  </View>
                </Card>
              ))}
              
              {selectedItems.length === 0 && (
                <View style={styles.emptyContainer}>
                  <Text variant="headlineSmall" style={[styles.emptyText, { color: theme.colors.onSurfaceVariant }]}>
                    No items selected.
                  </Text>
                </View>
              )}
            </ScrollView>

            <View style={styles.footer}>
              <Button 
                mode="contained" 
                onPress={onDismiss} 
                style={styles.confirmButton} 
                contentStyle={{ height: 56 }}
                labelStyle={{ fontSize: 16, fontWeight: '700' }}
              >
                Confirm Selection
              </Button>
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
    alignItems: "center",
    justifyContent: "space-between",
    marginVertical: 4,
  },
  statsInfo: {
    flex: 1,
  },
  clearButton: {
    borderRadius: 20,
  },
  buttonContent: {
    height: 40,
  },
  buttonLabel: {
    fontSize: 12,
  },
  scrollView: {
    flex: 1,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 24,
  },
  itemCard: {
    marginBottom: 12,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.03)',
  },
  itemRow: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
  },
  thumbnailWrapper: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  thumbnail: {
    width: 48,
    height: 48,
    borderRadius: 10,
  },
  iconPlaceholder: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  itemInfo: {
    flex: 1,
    marginLeft: 16,
  },
  itemName: {
    fontWeight: "600",
  },
  itemSize: {
    opacity: 0.7,
    marginTop: 2,
  },
  emptyContainer: {
    flex: 1,
    paddingVertical: 100,
    justifyContent: "center",
    alignItems: "center",
  },
  emptyText: {
    opacity: 0.7,
    fontWeight: "400",
    textAlign: 'center',
  },
  footer: {
    padding: 16,
  },
  confirmButton: {
    borderRadius: 28,
  },
});

export default SelectionDetailsPortal;
