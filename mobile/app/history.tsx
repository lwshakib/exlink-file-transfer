import React from "react";
import { StyleSheet, View } from "react-native";
import { IconButton, Text, Button, useTheme } from "react-native-paper";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";

export default function HistoryScreen() {
  const theme = useTheme();
  const router = useRouter();

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      {/* App Bar */}
      <View style={styles.appBar}>
        <IconButton
          icon="arrow-left"
          size={24}
          onPress={() => router.back()}
        />
        <Text variant="headlineSmall" style={styles.title}>
          History
        </Text>
      </View>

      {/* Action Buttons */}
      <View style={styles.buttonRow}>
        <Button
          mode="contained-tonal"
          icon="folder"
          onPress={() => {}}
          style={styles.actionButton}
          contentStyle={styles.buttonContent}
        >
          Open folder
        </Button>
        <Button
          mode="contained-tonal"
          icon="delete"
          onPress={() => {}}
          style={styles.actionButton}
          contentStyle={styles.buttonContent}
          disabled
        >
          Delete history
        </Button>
      </View>

      {/* Empty State */}
      <View style={styles.content}>
        <Text variant="headlineSmall" style={styles.emptyText}>
          The history is empty.
        </Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  appBar: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 4,
    height: 64,
  },
  title: {
    marginLeft: 8,
    fontWeight: "400",
  },
  buttonRow: {
    flexDirection: "row",
    paddingHorizontal: 16,
    gap: 12,
    marginTop: 8,
  },
  actionButton: {
    flex: 1,
    borderRadius: 20,
  },
  buttonContent: {
    height: 48,
  },
  content: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingBottom: 100, // Adjust to center text vertically in the remaining space
  },
  emptyText: {
    opacity: 0.7,
    fontWeight: "400",
  },
});
