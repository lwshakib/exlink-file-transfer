import React from "react";
import { StyleSheet, View, ScrollView, Platform, Dimensions, Image as RNImage } from "react-native";
import { Text, IconButton, useTheme, Card, Button } from "react-native-paper";
import { SafeAreaView } from "react-native-safe-area-context";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useSelection } from "@/hooks/useSelection";

export default function SelectionDetailsScreen() {
  const theme = useTheme();
  const router = useRouter();
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
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      {/* Header */}
      <View style={styles.header}>
        <IconButton icon="arrow-left" size={24} onPress={() => router.back()} />
        <Text variant="titleLarge" style={styles.headerTitle}>Selection</Text>
      </View>

      <View style={styles.summaryRow}>
        <View>
          <Text variant="bodyMedium">Files: {selectedItems.length}</Text>
          <Text variant="bodyMedium">Size: {formatSize(totalSize)}</Text>
        </View>
        <Button 
          mode="contained" 
          onPress={clearSelection} 
          style={styles.deleteAllButton}
          buttonColor={theme.colors.secondaryContainer}
          textColor={theme.colors.onSecondaryContainer}
        >
          Delete all
        </Button>
      </View>

      <ScrollView contentContainerStyle={styles.listContent}>
        {selectedItems.map((item) => (
          <Card key={item.id} style={styles.itemCard} mode="contained">
            <View style={styles.itemRow}>
              {item.type === 'media' && item.uri ? (
                <RNImage source={{ uri: item.uri }} style={styles.thumbnail} />
              ) : (
                <View style={[styles.iconPlaceholder, { backgroundColor: theme.colors.surfaceVariant }]}>
                  <MaterialCommunityIcons name={getIcon(item.type) as any} size={24} color={theme.colors.primary} />
                </View>
              )}
              
              <View style={styles.itemInfo}>
                <Text variant="bodyMedium" numberOfLines={1} style={styles.itemName}>{item.name}</Text>
                <Text variant="labelSmall" style={styles.itemSize}>{formatSize(item.size)}</Text>
              </View>

              <IconButton icon="delete-outline" size={24} onPress={() => removeItem(item.id)} />
            </View>
          </Card>
        ))}
        
        {selectedItems.length === 0 && (
          <View style={styles.emptyContainer}>
            <MaterialCommunityIcons name="file-question-outline" size={64} color={theme.colors.onSurfaceVariant} style={{ opacity: 0.3 }} />
            <Text variant="bodyLarge" style={{ opacity: 0.5, marginTop: 16 }}>No items selected</Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 8,
  },
  headerTitle: {
    marginLeft: 8,
    fontWeight: "bold",
  },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 24,
    paddingVertical: 16,
  },
  deleteAllButton: {
    borderRadius: 20,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 24,
  },
  itemCard: {
    marginBottom: 12,
    borderRadius: 16,
  },
  itemRow: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
  },
  thumbnail: {
    width: 48,
    height: 48,
    borderRadius: 8,
  },
  iconPlaceholder: {
    width: 48,
    height: 48,
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
  },
  itemInfo: {
    flex: 1,
    marginLeft: 16,
  },
  itemName: {
    fontWeight: "500",
  },
  itemSize: {
    opacity: 0.6,
    marginTop: 2,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 100,
  },
});
