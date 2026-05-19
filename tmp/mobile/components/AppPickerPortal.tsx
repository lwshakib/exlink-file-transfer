import React, { useState, useMemo } from 'react';
import { StyleSheet, View, ScrollView } from 'react-native';
import {
  Text,
  IconButton,
  useTheme,
  Card,
  Button,
  Modal,
  Portal,
  Searchbar,
  List,
  Checkbox,
} from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import { SelectedItem } from '@/hooks/useSelection';
import { SafeAreaView } from 'react-native-safe-area-context';

// Interface defining the properties the AppPickerPortal component accepts
interface AppPickerPortalProps {
  visible: boolean; // Controls whether this modal portal is currently displayed
  onDismiss: () => void; // Callback executed to close the portal
  onSelectApps: (apps: SelectedItem[]) => void; // Callback executed when an app is confirmed/selected
}

// Mock data for demonstration purposes as React Native doesn't natively fetch installed apps without extra modules
const MOCK_APPS = [
  { name: 'Camera', packageName: 'com.android.camera', icon: 'camera' },
  { name: 'Settings', packageName: 'com.android.settings', icon: 'cog' },
  { name: 'Browser', packageName: 'com.android.chrome', icon: 'google-chrome' },
  { name: 'Photos', packageName: 'com.google.android.apps.photos', icon: 'image-multiple' },
];

/**
 * AppPickerPortal displays a modal that allows users to pick installed APKs or apps.
 * Currently it demonstrates fetching a manual APK and lists some mock installed apps.
 */
const AppPickerPortal = ({ visible, onDismiss, onSelectApps }: AppPickerPortalProps) => {
  // Use the theme from react-native-paper to style components consistently
  const theme = useTheme();
  // State handling the search text input to filter the app list
  const [searchQuery, setSearchQuery] = useState('');
  // State managing an array of app package names that have been checked/selected
  const [selectedPackages, setSelectedPackages] = useState<string[]>([]);

  // Memoize the filtered list so it only recalculates when the search query changes
  const filteredApps = useMemo(() => {
    return MOCK_APPS.filter(
      (app) =>
        app.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        app.packageName.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [searchQuery]);

  // Handler to toggle selection true/false. If present, removes it; if absent, adds it.
  const toggleAppSelection = (packageName: string) => {
    setSelectedPackages((prev) =>
      prev.includes(packageName) ? prev.filter((p) => p !== packageName) : [...prev, packageName]
    );
  };

  // Handler that opens the device's document picker allowing the user to browse for .apk files
  const handlePickAPK = async () => {
    try {
      // Launch expo-document-picker scoped strictly to android packages (.apk files)
      const result = await DocumentPicker.getDocumentAsync({
        type: ['application/vnd.android.package-archive'], // MIME type for APKs
        multiple: true, // Allow selecting more than one
      });

      // If the user didn't cancel the file picker
      if (!result.canceled) {
        // Map native file objects back to our internal SelectedItem structure
        const newItems: SelectedItem[] = result.assets.map((asset) => ({
          id: asset.uri, // Use URI as a unique ID
          name: asset.name, // The file's name
          size: asset.size || 0, // Fallback to 0 if size unavailable
          type: 'app', // Distinct type for processing later
          uri: asset.uri, // Keeps a reference to local URI needed for transfer
        }));

        // Push the formatted items up to the parent component
        onSelectApps(newItems);
        // Automatically close the portal and return to the main screen
        onDismiss();
      }
    } catch (err) {
      console.error('Error picking app:', err);
    }
  };

  // Called when the user presses 'Add' after checking mocked apps
  const handleConfirm = () => {
    // In a real app with a native module, we would get the APK path here.
    // For this demonstration, we'll inform the user.
    if (selectedPackages.length > 0) {
      alert(
        "Installed app sharing requires a native module (e.g., react-native-get-installed-apps). For now, please use 'Pick APK from Storage' or Share the app from your home screen."
      );
    }
  };

  return (
    // Wrap with Portal to ensure the Modal layers on top of everything nicely
    <Portal>
      <Modal
        visible={visible} // Drive visibility from parent's prop
        onDismiss={onDismiss} // Enables tapping outside to close
        contentContainerStyle={[
          styles.modalContainer,
          { backgroundColor: theme.colors.background }, // Themed background
        ]}
      >
        {/* Enforce spacing around notches and home indicator area */}
        <SafeAreaView style={styles.safeArea} edges={['bottom']}>
          <View style={styles.container}>
            {/* Header section containing back button and title */}
            <View style={styles.header}>
              <IconButton icon="arrow-left" onPress={onDismiss} />
              <Text variant="headlineSmall" style={styles.title}>
                Select Apps
              </Text>
            </View>

            {/* Top actions section, containing the explicit Pick APK button */}
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

            {/* Standard search bar tracking the local searchQuery state */}
            <Searchbar
              placeholder="Search installed apps"
              onChangeText={setSearchQuery}
              value={searchQuery}
              style={styles.searchBar}
            />

            {/* Contains the list, with scrolling enabled for long lists */}
            <ScrollView contentContainerStyle={styles.listContent}>
              <Text variant="labelLarge" style={styles.sectionLabel}>
                Installed Apps (Simplified List)
              </Text>

              {/* Iterates dynamically over our memoized list rendering list items for each */}
              {filteredApps.map((app) => (
                <List.Item
                  key={app.packageName}
                  title={app.name} // Large primary text
                  description={app.packageName} // Secondary smaller text
                  left={(props) => <List.Icon {...props} icon={app.icon as any} />} // Display standard material icon
                  right={(props) => (
                    // React native paper Checkbox component tracking our selections array
                    <Checkbox
                      status={selectedPackages.includes(app.packageName) ? 'checked' : 'unchecked'}
                      onPress={() => toggleAppSelection(app.packageName)}
                    />
                  )}
                  onPress={() => toggleAppSelection(app.packageName)} // Tapping the row toggles as well
                />
              ))}

              {/* Information card giving quick tips on sharing explicitly from the launcher */}
              <Card style={styles.infoCard} mode="contained">
                <Card.Content>
                  <View style={styles.infoRow}>
                    <MaterialCommunityIcons
                      name="information-outline"
                      size={24}
                      color={theme.colors.primary}
                    />
                    <Text variant="bodySmall" style={styles.infoText}>
                      Tip: You can also share any installed app by long-pressing its icon on the
                      home screen and choosing {"'Share' → 'ExLink'."}
                    </Text>
                  </View>
                </Card.Content>
              </Card>
            </ScrollView>

            {/* Footer containing the final confirmation submit button */}
            <View style={styles.footer}>
              <Button
                mode="contained"
                onPress={handleConfirm}
                disabled={selectedPackages.length === 0} // Disable if nothing selected
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

// Extracted styles using StyleSheet API for optimal native performance
const styles = StyleSheet.create({
  modalContainer: {
    flex: 1, // Full screen takeover
    margin: 0,
  },
  safeArea: {
    flex: 1,
  },
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 8,
  },
  title: {
    marginLeft: 8,
  },
  topActions: {
    padding: 16,
  },
  apkButton: {
    borderRadius: 12, // Softer curves for the main action
  },
  searchBar: {
    marginHorizontal: 16,
    marginBottom: 8,
    borderRadius: 12,
  },
  listContent: {
    paddingBottom: 24, // Adds padding after list ends ensuring it clears fixed elements
  },
  sectionLabel: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    opacity: 0.7, // Faded effect for header labels
  },
  infoCard: {
    margin: 16,
    backgroundColor: 'rgba(255,255,255,0.05)', // Subtle contrast overlay
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  infoText: {
    marginLeft: 12,
    flex: 1, // Takes up remaining horizontal space
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
