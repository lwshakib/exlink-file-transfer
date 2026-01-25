import React, { useState, useEffect } from "react";
import { StyleSheet, View, ScrollView, TouchableOpacity, Platform } from "react-native";
import { Text, useTheme, Portal, Dialog, RadioButton, Button, TextInput, Switch, IconButton } from "react-native-paper";
import { SafeAreaView } from "react-native-safe-area-context";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useTheme as useAppTheme, ColorTheme } from "@/hooks/useTheme";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { uniqueNamesGenerator, adjectives, animals } from "unique-names-generator";
import * as FileSystem from "expo-file-system/legacy";
import * as DocumentPicker from "expo-document-picker";
import Svg, { G, Path } from "react-native-svg";
import { useSettingsStore } from "@/store/useSettingsStore";

const SettingRow = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <View style={styles.settingRow}>
    <Text variant="bodyLarge" style={styles.settingLabel}>{label}</Text>
    <View style={styles.settingControl}>
      {children}
    </View>
  </View>
);

const TonalBox = ({ text, icon, onPress }: { text?: string; icon?: string; onPress?: () => void }) => {
  const theme = useTheme();
  return (
    <TouchableOpacity 
      style={[styles.tonalBox, { backgroundColor: theme.colors.surfaceVariant }]} 
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={styles.tonalBoxContent}>
        {text && <Text variant="bodyMedium" style={styles.tonalBoxText}>{text}</Text>}
        {icon && <MaterialCommunityIcons name={icon as any} size={20} color={theme.colors.onSurfaceVariant} />}
      </View>
    </TouchableOpacity>
  );
};

const SelectableSetting = ({ 
  label,
  value, 
  options, 
  visible, 
  onOpen, 
  onClose, 
  onSelect 
}: { 
  label: string;
  value: string; 
  options: string[]; 
  visible: boolean; 
  onOpen: () => void; 
  onClose: () => void; 
  onSelect: (val: string) => void;
}) => {
  const theme = useTheme();
  return (
    <>
      <TonalBox text={value} icon="menu-down" onPress={onOpen} />
      <Portal>
        <Dialog visible={visible} onDismiss={onClose} style={{ backgroundColor: theme.colors.elevation.level3 }}>
          <Dialog.Title>{label}</Dialog.Title>
          <Dialog.Content>
            <RadioButton.Group onValueChange={val => { onSelect(val); onClose(); }} value={value}>
              {options.map((option) => (
                <View key={option} style={styles.radioRow}>
                  <RadioButton.Item 
                    label={option} 
                    value={option} 
                    style={{ paddingHorizontal: 0, width: '100%' }}
                    labelStyle={{ color: theme.colors.onSurface }}
                  />
                </View>
              ))}
            </RadioButton.Group>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={onClose}>Cancel</Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </>
  );
};

export default function SettingsScreen() {
  const theme = useTheme();
  const { colorScheme, setThemeScheme, selectedColor, setThemeColor } = useAppTheme();
  
  // Zustand Store
  const deviceName = useSettingsStore((state) => state.deviceName);
  const setDeviceName = useSettingsStore((state) => state.setDeviceName);
  const serverRunning = useSettingsStore((state) => state.serverRunning);
  const setServerRunning = useSettingsStore((state) => state.setServerRunning);
  const saveMediaToGallery = useSettingsStore((state) => state.saveMediaToGallery);
  const setSaveMediaToGallery = useSettingsStore((state) => state.setSaveMediaToGallery);
  const saveToFolderPath = useSettingsStore((state) => state.saveToFolderPath);
  const setSaveToFolderPath = useSettingsStore((state) => state.setSaveToFolderPath);

  // Local UI status
  const [saveToFolder, setSaveToFolder] = useState("Internal");
  const [deviceNameDialogVisible, setDeviceNameDialogVisible] = useState(false);
  const [deviceNameDraft, setDeviceNameDraft] = useState("");
  const [aboutDialogVisible, setAboutDialogVisible] = useState(false);

  useEffect(() => {
    if (saveToFolderPath) {
      if (saveToFolderPath.includes('primary%3ADownloads') || saveToFolderPath.includes('Download')) {
        setSaveToFolder('Downloads');
      } else {
        const decodedUri = decodeURIComponent(saveToFolderPath);
        const folderName = decodedUri.split('%3A').pop()?.split('/').pop() || 
                          decodedUri.split('/').pop() || "Custom Folder";
        setSaveToFolder(folderName);
      }
    } else {
      setSaveToFolder('Internal (Tap to change)');
    }
  }, [saveToFolderPath]);

  // First-run SAF check
  useEffect(() => {
    const checkFirstRun = async () => {
      if (Platform.OS === 'android' && !saveToFolderPath) {
        // We could automatically prompt here, but it might be annoying if done immediately. 
        // Best to just wait for the user to tap, or do it once.
        // Let's stick to the user's intent if they specifically asked for it.
      }
    };
    checkFirstRun();
  }, []);

  const [themeMenuVisible, setThemeMenuVisible] = useState(false);
  const [colorMenuVisible, setColorMenuVisible] = useState(false);

  const generateRandomName = () => {
    const random = uniqueNamesGenerator({
      dictionaries: [adjectives, animals],
      length: 2,
      separator: ' ',
      style: 'capital'
    });
    setDeviceNameDraft(random);
  };

  const openDeviceNameDialog = () => {
    setDeviceNameDraft(deviceName === "Loading..." ? "" : deviceName);
    setDeviceNameDialogVisible(true);
  };

  const saveDeviceName = () => {
    const next = deviceNameDraft.trim();
    if (!next) return;
    setDeviceName(next);
    setDeviceNameDialogVisible(false);
  };

  const handleServerToggle = (value: boolean) => {
    setServerRunning(value);
  };

  const handleSaveMediaToggle = (value: boolean) => {
    setSaveMediaToGallery(value);
  };

  const handleSelectFolder = async () => {
    try {
      if (Platform.OS === "android") {
        const permissions = await FileSystem.StorageAccessFramework.requestDirectoryPermissionsAsync();
        if (permissions.granted) {
          setSaveToFolderPath(permissions.directoryUri);
          return;
        }
      }

      // Fallback for iOS or if permissions denied/canceled
      const result = await DocumentPicker.getDocumentAsync({
        type: "*/*",
        copyToCacheDirectory: false,
      });
      
      if (!result.canceled && result.assets[0]) {
        const uri = result.assets[0].uri;
        const dir = uri.substring(0, uri.lastIndexOf('/'));
        setSaveToFolderPath(dir);
      }
    } catch (e) {
      console.error("Error selecting folder:", e);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Text variant="headlineSmall" style={styles.pageTitle}>Settings</Text>

        {/* General Section */}
        <View style={styles.section}>
          <Text variant="titleMedium" style={styles.sectionHeader}>General</Text>
          <SettingRow label="Theme">
            <SelectableSetting 
              label="Select Theme"
              value={colorScheme.charAt(0).toUpperCase() + colorScheme.slice(1)}
              options={["System", "Light", "Dark"]}
              visible={themeMenuVisible}
              onOpen={() => setThemeMenuVisible(true)}
              onClose={() => setThemeMenuVisible(false)}
              onSelect={(val) => setThemeScheme(val.toLowerCase() as any)}
            />
          </SettingRow>
          <SettingRow label="Color">
            <SelectableSetting 
              label="Select Color"
              value={selectedColor}
              options={["ExLink", "Emerald", "Violet", "Blue", "Amber", "Rose", "Random"]}
              visible={colorMenuVisible}
              onOpen={() => setColorMenuVisible(true)}
              onClose={() => setColorMenuVisible(false)}
              onSelect={(val) => setThemeColor(val as ColorTheme)}
            />
          </SettingRow>
        </View>

        {/* Network Section */}
        <View style={styles.section}>
          <Text variant="titleMedium" style={styles.sectionHeader}>Network</Text>
          

          
          <SettingRow label="Server">
            <View style={[styles.switchBox, { backgroundColor: theme.colors.surfaceVariant }]}>
              <Switch 
                value={serverRunning} 
                onValueChange={handleServerToggle} 
                color={theme.colors.primary} 
              />
            </View>
          </SettingRow>
          
          <SettingRow label="Device name">
            <TonalBox text={deviceName} onPress={openDeviceNameDialog} />
          </SettingRow>
        </View>

        {/* Receive Section */}
        <View style={styles.section}>
          <Text variant="titleMedium" style={styles.sectionHeader}>Receive</Text>
          <SettingRow label="Save to folder">
            <TonalBox text={saveToFolder} icon="chevron-right" onPress={handleSelectFolder} />
          </SettingRow>
          <SettingRow label="Save media to gallery">
            <View style={[styles.switchBox, { backgroundColor: theme.colors.surfaceVariant }]}>
              <Switch value={saveMediaToGallery} onValueChange={handleSaveMediaToggle} color={theme.colors.primary} />
            </View>
          </SettingRow>
        </View>

        {/* Other Section */}
        <View style={styles.section}>
          <Text variant="titleMedium" style={styles.sectionHeader}>Other</Text>
          <SettingRow label="About ExLink">
            <TonalBox text="Open" onPress={() => setAboutDialogVisible(true)} />
          </SettingRow>
          <SettingRow label="Support ExLink">
            <TonalBox text="Donate" />
          </SettingRow>
          <SettingRow label="Privacy Policy">
            <TonalBox text="Open" />
          </SettingRow>
        </View>

        {/* Device Name Dialog */}
        <Portal>
          <Dialog visible={deviceNameDialogVisible} onDismiss={() => setDeviceNameDialogVisible(false)} style={{ backgroundColor: theme.colors.elevation.level3 }}>
            <Dialog.Title>Device name</Dialog.Title>
            <Dialog.Content>
              <View style={styles.diceContainer}>
                <TouchableOpacity 
                  onPress={generateRandomName}
                  style={[styles.diceButton, { backgroundColor: theme.colors.surfaceVariant }]}
                >
                  <MaterialCommunityIcons name="dice-5" size={32} color={theme.colors.primary} />
                </TouchableOpacity>
              </View>
              <TextInput
                label="Name"
                value={deviceNameDraft}
                onChangeText={setDeviceNameDraft}
                mode="outlined"
                autoCapitalize="words"
                style={{ backgroundColor: "transparent", marginTop: 12 }}
              />
            </Dialog.Content>
            <Dialog.Actions>
              <Button onPress={() => setDeviceNameDialogVisible(false)}>Cancel</Button>
              <Button onPress={saveDeviceName} disabled={!deviceNameDraft.trim()}>Save</Button>
            </Dialog.Actions>
          </Dialog>
        </Portal>

        {/* About ExLink Dialog */}
        <Portal>
          <Dialog visible={aboutDialogVisible} onDismiss={() => setAboutDialogVisible(false)} style={{ backgroundColor: theme.colors.elevation.level3 }}>
            <Dialog.Content style={styles.aboutContent}>
              <View style={styles.logoContainer}>
                <Svg width="80" height="80" viewBox="0 0 48 48" fill="none">
                  <G translate="3 0" fill={theme.colors.primary}>
                    <Path d="m14.1061 19.6565c5.499-2.6299 9.8025-7.0929 12.2731-12.67168-1.5939-1.67362-3.666-2.86907-5.8975-3.58634l-1.1954-.39848c-.0797.15939-.1594.39849-.1594.55788-1.9127 5.41936-5.8178 9.80262-11.07766 12.27322-3.66599 1.7533-6.37564 4.9412-7.650763 8.7666l-.398477 1.1955c.159391.0797.39848.1593.557871.1593 1.514209.5579 3.028419 1.2752 4.462939 2.1519 1.99238-3.5864 5.18019-6.6148 9.08529-8.4479z"/>
                    <Path d="m37.2173 19.9753c-2.9487 4.463-7.0132 8.0494-12.034 10.4403-4.0645 1.9127-7.1726 5.499-8.6071 9.8026l-.3985 1.3549c1.5142 1.3548 3.3472 2.3909 5.3396 3.0284l1.1955.3985c.0796-.1594.1593-.3985.1593-.5579 1.9127-5.4193 5.8178-9.8026 11.0777-12.2732 3.666-1.7533 6.4553-4.9412 7.6507-8.7666l.3985-1.1954c-1.6736-.4782-3.2675-1.2752-4.7817-2.2316z" opacity=".5"/>
                    <Path d="m12.9903 37.4284c1.9924-4.7818 5.6584-8.6869 10.3604-10.9184 4.3035-2.0721 7.8898-5.26 10.3604-9.1651-1.833-1.7533-3.3472-3.7458-4.463-6.1366-2.9487 5.4193-7.571 9.8026-13.2294 12.5123-3.2675 1.5142-5.8974 4.1442-7.49136 7.3321 1.75326 1.6736 3.18786 3.7457 4.30356 6.0569 0 0 .0797.1594.1594.3188z" opacity=".7"/>
                  </G>
                </Svg>
              </View>
              <Text variant="headlineSmall" style={{ textAlign: "center", marginTop: 16, fontWeight: "bold" }}>
                ExLink
              </Text>
              <Text variant="bodyMedium" style={{ textAlign: "center", marginTop: 8, opacity: 0.7 }}>
                Version 1.0.0
              </Text>
              <Text variant="bodySmall" style={{ textAlign: "center", marginTop: 16, opacity: 0.6 }}>
                Seamless file transfer between desktop and mobile devices over local network.
              </Text>
              <Text variant="bodySmall" style={{ textAlign: "center", marginTop: 8, opacity: 0.6 }}>
                Created by LW Shakib
              </Text>
            </Dialog.Content>
            <Dialog.Actions>
              <Button onPress={() => setAboutDialogVisible(false)}>Close</Button>
            </Dialog.Actions>
          </Dialog>
        </Portal>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingVertical: 24,
    paddingHorizontal: 16,
  },
  pageTitle: {
    textAlign: "center",
    marginBottom: 32,
    fontWeight: "400",
  },
  section: {
    marginBottom: 32,
  },
  sectionHeader: {
    marginBottom: 16,
    fontWeight: "600",
  },
  settingRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
    minHeight: 48,
  },
  settingLabel: {
    flex: 1,
    paddingRight: 16,
  },
  settingControl: {
    flex: 0,
    minWidth: 120,
    alignItems: "flex-end",
  },
  tonalBox: {
    minWidth: 140,
    height: 48,
    borderRadius: 8,
    justifyContent: "center",
    paddingHorizontal: 16,
  },
  tonalBoxContent: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
  },
  tonalBoxText: {
    textAlign: "center",
  },
  switchBox: {
    width: 140,
    height: 48,
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
  },
  multiIconBox: {
    width: 140,
    height: 48,
    borderRadius: 8,
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "center",
  },
  miniIcon: {
    margin: 0,
  },
  radioRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  warningBanner: {
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
  },
  warningText: {
    fontSize: 12,
    fontWeight: "500",
    textAlign: "center",
  },
  diceContainer: {
    alignItems: "center",
    marginBottom: 8,
  },
  diceButton: {
    width: 56,
    height: 56,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  aboutContent: {
    alignItems: "center",
    paddingVertical: 8,
  },
  logoContainer: {
    alignItems: "center",
  },
});
