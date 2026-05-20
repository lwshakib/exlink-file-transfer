import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  ScrollView,
  TouchableOpacity,
  Platform,
  InteractionManager,
  Text as RNText,
  TextInput as RNTextInput,
  Switch as RNSwitch,
  Modal,
  TextProps,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme, ColorTheme } from '@/hooks/useTheme';
import { uniqueNamesGenerator, adjectives, animals } from 'unique-names-generator';
import * as FileSystem from 'expo-file-system/legacy';
import * as DocumentPicker from 'expo-document-picker';
import * as Network from 'expo-network';
import Svg, { G, Path } from 'react-native-svg';
import { useSettingsStore } from '@/store/useSettingsStore';

// Custom helper Text component mapping MD3 typography variant sizes
const Text = ({
  variant,
  style,
  children,
  numberOfLines,
  ...props
}: TextProps & {
  variant?: 'headlineMedium' | 'headlineSmall' | 'titleLarge' | 'titleMedium' | 'bodyLarge' | 'bodyMedium' | 'bodySmall';
  numberOfLines?: number;
}) => {
  let variantStyle = {};
  switch (variant) {
    case 'headlineMedium':
      variantStyle = { fontSize: 24, fontWeight: 'bold' as const };
      break;
    case 'headlineSmall':
      variantStyle = { fontSize: 20, fontWeight: 'bold' as const };
      break;
    case 'titleLarge':
      variantStyle = { fontSize: 20, fontWeight: '700' as const };
      break;
    case 'titleMedium':
      variantStyle = { fontSize: 16, fontWeight: '700' as const };
      break;
    case 'bodyLarge':
      variantStyle = { fontSize: 16 };
      break;
    case 'bodyMedium':
      variantStyle = { fontSize: 14 };
      break;
    case 'bodySmall':
      variantStyle = { fontSize: 12 };
      break;
  }
  return (
    <RNText style={[variantStyle, style]} numberOfLines={numberOfLines} {...props}>
      {children}
    </RNText>
  );
};

// Custom premium Dialog component using React Native standard Modal
const CustomDialog = ({
  visible,
  onDismiss,
  title,
  children,
  actions,
  themeColors,
}: {
  visible: boolean;
  onDismiss: () => void;
  title?: string;
  children: React.ReactNode;
  actions?: React.ReactNode;
  themeColors: any;
}) => {
  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={onDismiss}
    >
      <TouchableOpacity
        style={styles.modalOverlay}
        activeOpacity={1}
        onPress={onDismiss}
      >
        <TouchableOpacity
          activeOpacity={1}
          style={[styles.dialogContainer, { backgroundColor: themeColors.elevation.level3 }]}
        >
          {title && (
            <Text variant="titleMedium" style={[styles.dialogTitle, { color: themeColors.onSurface }]}>
              {title}
            </Text>
          )}
          <View style={styles.dialogContent}>{children}</View>
          {actions && <View style={styles.dialogActions}>{actions}</View>}
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
};

// TonalBox is a styled button container matching Material 3 surface tones
const TonalBox = ({
  text,
  icon,
  onPress,
}: {
  text?: string;
  icon?: string;
  onPress?: () => void;
}) => {
  const { colorScheme, selectedVariation } = useTheme();
  const themeColors = selectedVariation[colorScheme];
  return (
    <TouchableOpacity
      style={[styles.tonalBox, { backgroundColor: themeColors.surfaceVariant }]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={styles.tonalBoxContent}>
        {text && (
          <Text variant="bodyMedium" style={[styles.tonalBoxText, { color: themeColors.onSurfaceVariant }]}>
            {text}
          </Text>
        )}
        {icon && (
          <MaterialCommunityIcons
            name={icon as any}
            size={20}
            color={themeColors.onSurfaceVariant}
          />
        )}
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
  onSelect,
}: {
  label: string;
  value: string;
  options: string[];
  visible: boolean;
  onOpen: () => void;
  onClose: () => void;
  onSelect: (val: string) => void;
}) => {
  const { colorScheme, selectedVariation } = useTheme();
  const themeColors = selectedVariation[colorScheme];
  return (
    <>
      <TonalBox text={value} icon="menu-down" onPress={onOpen} />
      <CustomDialog
        visible={visible}
        onDismiss={onClose}
        title={label}
        themeColors={themeColors}
        actions={
          <TouchableOpacity onPress={onClose} style={styles.dialogButton}>
            <Text style={{ color: themeColors.primary, fontWeight: '600' }}>Cancel</Text>
          </TouchableOpacity>
        }
      >
        <View style={styles.radioList}>
          {options.map((option) => {
            const isSelected = option === value;
            return (
              <TouchableOpacity
                key={option}
                style={styles.radioRow}
                onPress={() => {
                  onSelect(option);
                  onClose();
                }}
              >
                <Text style={{ fontSize: 16, color: themeColors.onSurface, flex: 1 }}>
                  {option}
                </Text>
                <View
                  style={[
                    styles.radioButtonOuter,
                    { borderColor: isSelected ? themeColors.primary : themeColors.outline },
                  ]}
                >
                  {isSelected && (
                    <View style={[styles.radioButtonInner, { backgroundColor: themeColors.primary }]} />
                  )}
                </View>
              </TouchableOpacity>
            );
          })}
        </View>
      </CustomDialog>
    </>
  );
};

// PremiumSettingRow implements a beautifully formatted options row with left-side icons, titles, descriptions, and custom controls.
const PremiumSettingRow = ({
  icon,
  label,
  description,
  children,
  isLast = false,
}: {
  icon: string;
  label: string;
  description?: string;
  children: React.ReactNode;
  isLast?: boolean;
}) => {
  const { colorScheme, selectedVariation } = useTheme();
  const themeColors = selectedVariation[colorScheme];
  return (
    <View>
      <View style={styles.premiumSettingRow}>
        <View style={styles.premiumSettingLeft}>
          <View style={[styles.iconContainer, { backgroundColor: themeColors.secondaryContainer }]}>
            <MaterialCommunityIcons name={icon as any} size={20} color={themeColors.primary} />
          </View>
          <View style={styles.premiumSettingText}>
            <Text variant="bodyLarge" style={{ fontWeight: '600', color: themeColors.onSurface }}>
              {label}
            </Text>
            {description && (
              <Text variant="bodySmall" style={{ color: themeColors.onSurfaceVariant, marginTop: 2, opacity: 0.8 }}>
                {description}
              </Text>
            )}
          </View>
        </View>
        <View style={styles.premiumSettingControl}>{children}</View>
      </View>
      {!isLast && <View style={[styles.premiumDivider, { backgroundColor: themeColors.surfaceVariant }]} />}
    </View>
  );
};

// PremiumSectionCard groups options in unified Material 3 outline elevation cards
const PremiumSectionCard = ({ title, children }: { title: string; children: React.ReactNode }) => {
  const { colorScheme, selectedVariation } = useTheme();
  const themeColors = selectedVariation[colorScheme];
  return (
    <View style={styles.premiumSection}>
      <Text variant="titleMedium" style={[styles.premiumSectionHeader, { color: themeColors.primary }]}>
        {title}
      </Text>
      <View style={[styles.premiumCard, { backgroundColor: themeColors.elevation.level1 }]}>
        {children}
      </View>
    </View>
  );
};

// SettingsScreen manages user preferences for identification, networking, and filesystem behavior
export default function SettingsScreen() {
  const { colorScheme, selectedVariation, setThemeScheme, selectedColor, setThemeColor } = useTheme();
  const themeColors = selectedVariation[colorScheme];

  // --- Persistent Settings Pulls (Zustand) ---
  const deviceName = useSettingsStore((state) => state.deviceName);
  const setDeviceName = useSettingsStore((state) => state.setDeviceName);
  const deviceId = useSettingsStore((state) => state.deviceId);
  const serverRunning = useSettingsStore((state) => state.serverRunning);
  const setServerRunning = useSettingsStore((state) => state.setServerRunning);
  const saveMediaToGallery = useSettingsStore((state) => state.saveMediaToGallery);
  const setSaveMediaToGallery = useSettingsStore((state) => state.setSaveMediaToGallery);
  const saveToFolderPath = useSettingsStore((state) => state.saveToFolderPath);
  const setSaveToFolderPath = useSettingsStore((state) => state.setSaveToFolderPath);

  // --- Local Component State for UI Modals & Feedback ---
  const [saveToFolder, setSaveToFolder] = useState('Internal');
  const [deviceNameDialogVisible, setDeviceNameDialogVisible] = useState(false);
  const [deviceNameDraft, setDeviceNameDraft] = useState('');
  const [aboutDialogVisible, setAboutDialogVisible] = useState(false);
  const [deviceIp, setDeviceIp] = useState<string>('');

  // Fetch active network subnet IP on mount to enrich settings metadata
  useEffect(() => {
    let active = true;
    const fetchIp = async () => {
      try {
        const ip = await Network.getIpAddressAsync();
        if (active) {
          setDeviceIp(ip);
        }
      } catch (e) {
        console.warn('Could not fetch network IP in settings:', e);
      }
    };
    
    const task = InteractionManager.runAfterInteractions(() => {
      fetchIp();
    });
    
    return () => {
      active = false;
      task.cancel();
    };
  }, []);

  useEffect(() => {
    if (saveToFolderPath) {
      if (
        saveToFolderPath.includes('primary%3ADownloads') ||
        saveToFolderPath.includes('Download')
      ) {
        setSaveToFolder('Downloads');
      } else {
        const decodedUri = decodeURIComponent(saveToFolderPath);
        const folderName =
          decodedUri.split('%3A').pop()?.split('/').pop() ||
          decodedUri.split('/').pop() ||
          'Custom Folder';
        setSaveToFolder(folderName);
      }
    } else {
      setSaveToFolder('Internal');
    }
  }, [saveToFolderPath]);

  const [themeMenuVisible, setThemeMenuVisible] = useState(false);
  const [colorMenuVisible, setColorMenuVisible] = useState(false);

  const generateRandomName = () => {
    const random = uniqueNamesGenerator({
      dictionaries: [adjectives, animals],
      length: 2,
      separator: ' ',
      style: 'capital',
    });
    setDeviceNameDraft(random);
  };

  const openDeviceNameDialog = () => {
    setDeviceNameDraft(deviceName === 'Loading...' ? '' : deviceName);
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

  // Platform-Specific Folder Selection:
  // - Android uses SAF (Storage Access Framework) to gain generic directory permissions.
  // - iOS uses standard DocumentPickers to resolve accessible sandbox directories.
  const handleSelectFolder = async () => {
    try {
      if (Platform.OS === 'android') {
        const permissions =
          await FileSystem.StorageAccessFramework.requestDirectoryPermissionsAsync();
        if (permissions.granted) {
          setSaveToFolderPath(permissions.directoryUri);
          return;
        }
      }

      // iOS Fallback: Allows selecting a specific folder via native file browser
      const result = await DocumentPicker.getDocumentAsync({
        type: '*/*',
        copyToCacheDirectory: false,
      });

      if (!result.canceled && result.assets[0]) {
        const uri = result.assets[0].uri;
        const dir = uri.substring(0, uri.lastIndexOf('/'));
        setSaveToFolderPath(dir);
      }
    } catch (e) {
      console.error('Error selecting folder:', e);
    }
  };

  // Extract avatar profile abbreviation (e.g. "Aqua Tiger" -> "AT")
  const avatarInitials =
    deviceName && deviceName !== 'Loading...'
      ? deviceName
          .split(' ')
          .map((n) => n[0])
          .slice(0, 2)
          .join('')
          .toUpperCase()
      : 'EX';

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: themeColors.background }]}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        
        {/* Profile Identity Card */}
        <View style={[styles.identityCard, { backgroundColor: themeColors.secondaryContainer }]}>
          <View style={styles.identityLeft}>
            {/* Round Avatar Container */}
            <View style={[styles.avatarCircle, { backgroundColor: themeColors.primaryContainer }]}>
              <Text variant="headlineMedium" style={[styles.avatarText, { color: themeColors.onPrimaryContainer }]}>
                {avatarInitials}
              </Text>
              {serverRunning && (
                <View style={[styles.activeIndicator, { backgroundColor: '#4CAF50', borderColor: themeColors.secondaryContainer }]} />
              )}
            </View>
            
            {/* Identity Info Panel */}
            <View style={styles.identityInfo}>
              <View style={styles.nameRow}>
                <Text variant="titleLarge" numberOfLines={1} style={[styles.deviceNameText, { color: themeColors.onSecondaryContainer }]}>
                  {deviceName}
                </Text>
                <TouchableOpacity onPress={openDeviceNameDialog} style={styles.editPen} activeOpacity={0.6}>
                  <MaterialCommunityIcons name="pencil-outline" size={18} color={themeColors.primary} />
                </TouchableOpacity>
              </View>
              <Text variant="bodyMedium" style={{ color: themeColors.onSecondaryContainer, opacity: 0.8, marginTop: 2 }}>
                ID: {deviceId ? deviceId.substring(0, 8) : 'Loading...'}
              </Text>
              <View style={[styles.ipBadge, { backgroundColor: themeColors.surfaceVariant }]}>
                <MaterialCommunityIcons name="wifi" size={14} color={themeColors.primary} style={{ marginRight: 4 }} />
                <Text variant="bodySmall" style={{ color: themeColors.onSurfaceVariant, fontWeight: '700' }}>
                  {deviceIp || 'No IP detected'}
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* General Options Card Group */}
        <PremiumSectionCard title="General">
          <PremiumSettingRow
            icon="palette-outline"
            label="Theme"
            description="Select light, dark, or system scheme"
          >
            <SelectableSetting
              label="Select Theme"
              value={colorScheme.charAt(0).toUpperCase() + colorScheme.slice(1)}
              options={['System', 'Light', 'Dark']}
              visible={themeMenuVisible}
              onOpen={() => setThemeMenuVisible(true)}
              onClose={() => setThemeMenuVisible(false)}
              onSelect={(val) => setThemeScheme(val.toLowerCase() as any)}
            />
          </PremiumSettingRow>

          <PremiumSettingRow
            icon="palette-swatch-outline"
            label="Accent Color"
            description="Customize key application interface colors"
            isLast={true}
          >
            <SelectableSetting
              label="Select Color"
              value={selectedColor}
              options={['Default', 'Emerald', 'Violet', 'Blue', 'Amber', 'Rose', 'Random']}
              visible={colorMenuVisible}
              onOpen={() => setColorMenuVisible(true)}
              onClose={() => setColorMenuVisible(false)}
              onSelect={(val) => setThemeColor(val as ColorTheme)}
            />
          </PremiumSettingRow>
        </PremiumSectionCard>

        {/* Network & Identity Options Card Group */}
        <PremiumSectionCard title="Network">
          <PremiumSettingRow
            icon="server-network"
            label="Background Server"
            description="Enable direct local background listening"
          >
            <RNSwitch
              value={serverRunning}
              onValueChange={handleServerToggle}
              trackColor={{ false: themeColors.outline, true: themeColors.primary }}
              thumbColor={Platform.OS === 'ios' ? undefined : '#f4f3f4'}
            />
          </PremiumSettingRow>

          <PremiumSettingRow
            icon="laptop"
            label="Device name"
            description="Broadcast profile identification label"
            isLast={true}
          >
            <TonalBox text={deviceName} onPress={openDeviceNameDialog} />
          </PremiumSettingRow>
        </PremiumSectionCard>

        {/* File Receive Options Card Group */}
        <PremiumSectionCard title="Receive Options">
          <PremiumSettingRow
            icon="folder-open-outline"
            label="Save to Folder"
            description="Destination path for received files"
          >
            <TonalBox text={saveToFolder} icon="chevron-right" onPress={handleSelectFolder} />
          </PremiumSettingRow>

          <PremiumSettingRow
            icon="image-multiple-outline"
            label="Gallery Integration"
            description="Save compatible media files straight to gallery"
            isLast={true}
          >
            <RNSwitch
              value={saveMediaToGallery}
              onValueChange={handleSaveMediaToggle}
              trackColor={{ false: themeColors.outline, true: themeColors.primary }}
              thumbColor={Platform.OS === 'ios' ? undefined : '#f4f3f4'}
            />
          </PremiumSettingRow>
        </PremiumSectionCard>

        {/* App Meta Card Group */}
        <PremiumSectionCard title="Other">
          <PremiumSettingRow
            icon="information-outline"
            label="About ExLink"
            description="View version and development details"
          >
            <TonalBox text="Open" onPress={() => setAboutDialogVisible(true)} />
          </PremiumSettingRow>

          <PremiumSettingRow
            icon="heart-outline"
            label="Support ExLink"
            description="Donate to fund developers"
          >
            <TonalBox text="Donate" />
          </PremiumSettingRow>

          <PremiumSettingRow
            icon="shield-check-outline"
            label="Privacy Policy"
            description="Review details on user data security"
            isLast={true}
          >
            <TonalBox text="Open" />
          </PremiumSettingRow>
        </PremiumSectionCard>

        {/* Device Name Dialog */}
        <CustomDialog
          visible={deviceNameDialogVisible}
          onDismiss={() => setDeviceNameDialogVisible(false)}
          title="Device name"
          themeColors={themeColors}
          actions={
            <>
              <TouchableOpacity
                onPress={() => setDeviceNameDialogVisible(false)}
                style={styles.dialogButton}
              >
                <Text style={{ color: themeColors.primary, fontWeight: '600' }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={saveDeviceName}
                disabled={!deviceNameDraft.trim()}
                style={[styles.dialogButton, !deviceNameDraft.trim() && { opacity: 0.5 }]}
              >
                <Text style={{ color: themeColors.primary, fontWeight: 'bold' }}>Save</Text>
              </TouchableOpacity>
            </>
          }
        >
          <View style={styles.diceContainer}>
            <TouchableOpacity
              onPress={generateRandomName}
              style={[styles.diceButton, { backgroundColor: themeColors.surfaceVariant }]}
              activeOpacity={0.7}
            >
              <MaterialCommunityIcons name="dice-5" size={32} color={themeColors.primary} />
            </TouchableOpacity>
          </View>
          <View style={[styles.textInputContainer, { borderColor: themeColors.outline }]}>
            <RNTextInput
              value={deviceNameDraft}
              onChangeText={setDeviceNameDraft}
              autoCapitalize="words"
              placeholder="Name"
              placeholderTextColor={themeColors.onSurfaceVariant + '80'}
              style={[styles.textInput, { color: themeColors.onSurface }]}
            />
          </View>
        </CustomDialog>

        {/* About ExLink Dialog */}
        <CustomDialog
          visible={aboutDialogVisible}
          onDismiss={() => setAboutDialogVisible(false)}
          themeColors={themeColors}
          actions={
            <TouchableOpacity
              onPress={() => setAboutDialogVisible(false)}
              style={styles.dialogButton}
            >
              <Text style={{ color: themeColors.primary, fontWeight: 'bold' }}>Close</Text>
            </TouchableOpacity>
          }
        >
          <View style={styles.aboutContent}>
            <View style={styles.logoContainer}>
              <Svg width="80" height="80" viewBox="0 0 48 48" fill="none">
                <G translate="3 0" fill={themeColors.primary}>
                  <Path d="m14.1061 19.6565c5.499-2.6299 9.8025-7.0929 12.2731-12.67168-1.5939-1.67362-3.666-2.86907-5.8975-3.58634l-1.1954-.39848c-.0797.15939-.1594.39849-.1594.55788-1.9127 5.41936-5.8178 9.80262-11.07766 12.27322-3.66599 1.7533-6.37564 4.9412-7.650763 8.7666l-.398477 1.1955c.159391.0797.39848.1593.557871.1593 1.514209.5579 3.028419 1.2752 4.462939 2.1519 1.99238-3.5864 5.18019-6.6148 9.08529-8.4479z" />
                  <Path
                    d="m37.2173 19.9753c-2.9487 4.463-7.0132 8.0494-12.034 10.4403-4.0645 1.9127-7.1726 5.499-8.6071 9.8026l-.3985 1.3549c1.5142 1.3548 3.3472 2.3909 5.3396 3.0284l1.1955.3985c.0796-.1594.1593-.3985.1593-.5579 1.9127-5.4193 5.8178-9.8026 11.0777-12.2732 3.666-1.7533 6.4553-4.9412 7.6507-8.7666l.3985-1.1954c-1.6736-.4782-3.2675-1.2752-4.7817-2.2316z"
                    opacity=".5"
                  />
                  <Path
                    d="m12.9903 37.4284c1.9924-4.7818 5.6584-8.6869 10.3604-10.9184 4.3035-2.0721 7.8898-5.26 10.3604-9.1651-1.833-1.7533-3.3472-3.7458-4.463-6.1366-2.9487 5.4193-7.571 9.8026-13.2294 12.5123-3.2675 1.5142-5.8974 4.1442-7.49136 7.3321 1.75326 1.6736 3.18786 3.7457 4.30356 6.0569 0 0 .0797.1594.1594.3188z"
                    opacity=".7"
                  />
                </G>
              </Svg>
            </View>
            <Text
              variant="headlineSmall"
              style={{ textAlign: 'center', marginTop: 16, fontWeight: 'bold', color: themeColors.onSurface }}
            >
              ExLink
            </Text>
            <Text
              variant="bodyMedium"
              style={{ textAlign: 'center', marginTop: 8, opacity: 0.7, color: themeColors.onSurface }}
            >
              Version 1.0.0
            </Text>
            <Text
              variant="bodySmall"
              style={{ textAlign: 'center', marginTop: 16, opacity: 0.6, color: themeColors.onSurface }}
            >
              Seamless file transfer between desktop and mobile devices over local network.
            </Text>
            <Text variant="bodySmall" style={{ textAlign: 'center', marginTop: 8, opacity: 0.6, color: themeColors.onSurface }}>
              Created by LW Shakib
            </Text>
          </View>
        </CustomDialog>
      </ScrollView>
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
    paddingHorizontal: 16,
  },
  identityCard: {
    flexDirection: 'row',
    borderRadius: 20,
    padding: 16,
    marginBottom: 24,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  identityLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  avatarCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 3,
  },
  avatarText: {
    fontWeight: 'bold',
    fontSize: 22,
    letterSpacing: 0.5,
  },
  activeIndicator: {
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 2,
    position: 'absolute',
    bottom: 0,
    right: 0,
  },
  identityInfo: {
    marginLeft: 16,
    flex: 1,
    justifyContent: 'center',
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  deviceNameText: {
    fontWeight: '700',
    fontSize: 18,
    marginRight: 4,
  },
  editPen: {
    padding: 4,
  },
  ipBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  premiumSection: {
    marginBottom: 24,
  },
  premiumSectionHeader: {
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1.2,
    marginBottom: 8,
    marginLeft: 4,
    opacity: 0.85,
  },
  premiumCard: {
    borderRadius: 20,
    paddingHorizontal: 16,
    elevation: 0.5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  premiumSettingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    minHeight: 56,
  },
  premiumSettingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    paddingRight: 12,
  },
  iconContainer: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  premiumSettingText: {
    flex: 1,
  },
  premiumSettingControl: {
    justifyContent: 'center',
    alignItems: 'flex-end',
  },
  premiumDivider: {
    height: StyleSheet.hairlineWidth,
    opacity: 0.15,
    marginLeft: 48,
  },
  tonalBox: {
    minWidth: 100,
    height: 38,
    borderRadius: 10,
    justifyContent: 'center',
    paddingHorizontal: 12,
  },
  tonalBoxContent: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 4,
  },
  tonalBoxText: {
    fontWeight: '600',
    fontSize: 13,
  },
  radioRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
  },
  radioList: {
    gap: 4,
  },
  radioButtonOuter: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioButtonInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  diceContainer: {
    alignItems: 'center',
    marginBottom: 8,
  },
  diceButton: {
    width: 56,
    height: 56,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  aboutContent: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  logoContainer: {
    alignItems: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  dialogContainer: {
    width: '100%',
    maxWidth: 320,
    borderRadius: 28,
    padding: 24,
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
  },
  dialogTitle: {
    marginBottom: 16,
  },
  dialogContent: {
    marginBottom: 16,
  },
  dialogActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
  },
  dialogButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  textInputContainer: {
    borderWidth: 1.5,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 10,
    marginTop: 12,
  },
  textInput: {
    fontSize: 16,
    padding: 0,
  },
});
