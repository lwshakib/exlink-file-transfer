import React from "react";
import { StyleSheet, View, Platform } from "react-native";
import { IconButton, Text, Button, useTheme, Modal, Portal } from "react-native-paper";
import { SafeAreaView } from "react-native-safe-area-context";

interface HistoryPortalProps {
  visible: boolean;
  onDismiss: () => void;
}

const HistoryPortal = ({ visible, onDismiss }: HistoryPortalProps) => {
  const theme = useTheme();

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
                icon="folder"
                onPress={() => {}}
                style={styles.actionButton}
                contentStyle={styles.buttonContent}
                labelStyle={styles.buttonLabel}
              >
                Open folder
              </Button>
              <Button
                mode="contained-tonal"
                icon="delete"
                onPress={() => {}}
                style={styles.actionButton}
                contentStyle={styles.buttonContent}
                labelStyle={styles.buttonLabel}
                buttonColor={theme.colors.errorContainer}
                textColor={theme.colors.onErrorContainer}
              >
                Delete history
              </Button>
            </View>

            {/* Empty State Content */}
            <View style={styles.content}>
              <Text variant="headlineSmall" style={[styles.emptyText, { color: theme.colors.onSurfaceVariant }]}>
                The history is empty.
              </Text>
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
  content: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingBottom: 64, // Slightly offset from center for better visual balance
  },
  emptyText: {
    opacity: 0.7,
    fontWeight: "400",
    textAlign: 'center',
  },
});

export default HistoryPortal;
