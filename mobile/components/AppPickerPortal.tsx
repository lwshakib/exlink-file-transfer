import React, { useState, useMemo } from "react";
import { StyleSheet, View, ScrollView, Platform } from "react-native";
import { Text, IconButton, useTheme, Card, Button, Modal, Portal, Searchbar, List, Checkbox } from "react-native-paper";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import * as DocumentPicker from "expo-document-picker";
import { SelectedItem } from "@/hooks/useSelection";
import { SafeAreaView } from "react-native-safe-area-context";

interface AppPickerPortalProps {
  visible: boolean;
  onDismiss: () => void;
  onSelectApps: (apps: SelectedItem[]) => void;
}

// Mock data for demonstration when we can't get real apps
const MOCK_APPS = [
  { name: "Camera", packageName: "com.android.camera", icon: "camera" },
  { name: "Settings", packageName: "com.android.settings", icon: "cog" },
  { name: "Browser", packageName: "com.android.chrome", icon: "google-chrome" },
  { name: "Photos", packageName: "com.google.android.apps.photos", icon: "image-multiple" },
];

const AppPickerPortal = ({ visible, onDismiss, onSelectApps }: AppPickerPortalProps) => {
  const theme = useTheme();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedPackages, setSelectedPackages] = useState<string[]>([]);

  const filteredApps = useMemo(() => {
    return MOCK_APPS.filter(app => 
      app.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
      app.packageName.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [searchQuery]);

  const toggleAppSelection = (packageName: string) => {
    setSelectedPackages(prev => 
      prev.includes(packageName) 
        ? prev.filter(p => p !== packageName) 
        : [...prev, packageName]
    );
  };

  const handlePickAPK = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ["application/vnd.android.package-archive"],
        multiple: true,
      });
      if (!result.canceled) {
        const newItems: SelectedItem[] = result.assets.map(asset => ({
          id: asset.uri,
          name: asset.name,
          size: asset.size || 0,
          type: 'app',
          uri: asset.uri,
        }));
        onSelectApps(newItems);
        onDismiss();
      }
    } catch (err) {
      console.error("Error picking app:", err);
    }
  };

  const handleConfirm = () => {
    // In a real app with a native module, we would get the APK path here.
    // For this demonstration, we'll inform the user.
    if (selectedPackages.length > 0) {
        alert("Installed app sharing requires a native module (e.g., react-native-get-installed-apps). For now, please use 'Pick APK from Storage' or Share the app from your home screen.");
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
            <View style={styles.header}>
              <IconButton icon="arrow-left" onPress={onDismiss} />
              <Text variant="headlineSmall" style={styles.title}>Select Apps</Text>
            </View>

            <View style={styles.topActions}>
              <Button 
                mode="contained" 
                icon="folder-open" 
                onPress={handlePickAPK}
                style={styles.apkButton}
              >
                Pick APK from Storage
              </Button>
            </View>

            <Searchbar
              placeholder="Search installed apps"
              onChangeText={setSearchQuery}
              value={searchQuery}
              style={styles.searchBar}
            />

            <ScrollView contentContainerStyle={styles.listContent}>
              <Text variant="labelLarge" style={styles.sectionLabel}>Installed Apps (Simplified List)</Text>
              {filteredApps.map((app) => (
                <List.Item
                  key={app.packageName}
                  title={app.name}
                  description={app.packageName}
                  left={props => <List.Icon {...props} icon={app.icon as any} />}
                  right={props => (
                    <Checkbox
                      status={selectedPackages.includes(app.packageName) ? 'checked' : 'unchecked'}
                      onPress={() => toggleAppSelection(app.packageName)}
                    />
                  )}
                  onPress={() => toggleAppSelection(app.packageName)}
                />
              ))}
              
              <Card style={styles.infoCard} mode="contained">
                <Card.Content>
                  <View style={styles.infoRow}>
                    <MaterialCommunityIcons name="information-outline" size={24} color={theme.colors.primary} />
                    <Text variant="bodySmall" style={styles.infoText}>
                      Tip: You can also share any installed app by long-pressing its icon on the home screen and choosing 'Share' {'→'} 'ExLink'.
                    </Text>
                  </View>
                </Card.Content>
              </Card>
            </ScrollView>

            <View style={styles.footer}>
              <Button 
                mode="contained" 
                onPress={handleConfirm}
                disabled={selectedPackages.length === 0}
                style={styles.confirmButton}
              >
                Add {selectedPackages.length > 0 ? `(${selectedPackages.length})` : ''}
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
  },
  safeArea: {
    flex: 1,
  },
  container: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingTop: 8,
  },
  title: {
    marginLeft: 8,
  },
  topActions: {
    padding: 16,
  },
  apkButton: {
    borderRadius: 12,
  },
  searchBar: {
    marginHorizontal: 16,
    marginBottom: 8,
    borderRadius: 12,
  },
  listContent: {
    paddingBottom: 24,
  },
  sectionLabel: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    opacity: 0.7,
  },
  infoCard: {
    margin: 16,
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  infoText: {
    marginLeft: 12,
    flex: 1,
  },
  footer: {
    padding: 16,
  },
  confirmButton: {
    borderRadius: 28,
    paddingVertical: 4,
  },
});

export default AppPickerPortal;
