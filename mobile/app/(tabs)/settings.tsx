import React, { useState } from "react";
import { StyleSheet, View, ScrollView, TouchableOpacity } from "react-native";
import { Text, useTheme, Switch, IconButton, Checkbox, Menu, Divider } from "react-native-paper";
import { SafeAreaView } from "react-native-safe-area-context";
import { MaterialCommunityIcons } from "@expo/vector-icons";

export default function SettingsScreen() {
  const theme = useTheme();
  const [animations, setAnimations] = useState(true);
  const [quickSave, setQuickSave] = useState(false);
  const [quickSaveFav, setQuickSaveFav] = useState(false);
  const [requirePin, setRequirePin] = useState(false);
  const [saveMedia, setSaveMedia] = useState(true);
  const [autoFinish, setAutoFinish] = useState(false);
  const [saveHistory, setSaveHistory] = useState(true);
  const [advanced, setAdvanced] = useState(false);

  const [themeValue, setThemeValue] = useState("System");
  const [colorValue, setColorValue] = useState("System");
  const [langValue, setLangValue] = useState("System");

  const [themeMenuVisible, setThemeMenuVisible] = useState(false);
  const [colorMenuVisible, setColorMenuVisible] = useState(false);
  const [langMenuVisible, setLangMenuVisible] = useState(false);

  const SettingRow = ({ label, children }: { label: string; children: React.ReactNode }) => (
    <View style={styles.settingRow}>
      <Text variant="bodyLarge" style={styles.settingLabel}>{label}</Text>
      <View style={styles.settingControl}>
        {children}
      </View>
    </View>
  );

  const TonalBox = ({ text, icon, onPress }: { text?: string; icon?: string; onPress?: () => void }) => (
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

  const SelectableSetting = ({ 
    value, 
    options, 
    visible, 
    onOpen, 
    onClose, 
    onSelect 
  }: { 
    value: string; 
    options: string[]; 
    visible: boolean; 
    onOpen: () => void; 
    onClose: () => void; 
    onSelect: (val: string) => void;
  }) => (
    <Menu
      visible={visible}
      onDismiss={onClose}
      anchor={
        <TonalBox text={value} icon="menu-down" onPress={onOpen} />
      }
      contentStyle={{ backgroundColor: theme.colors.elevation.level3 }}
    >
      {options.map((option) => (
        <Menu.Item 
          key={option} 
          onPress={() => {
            onSelect(option);
            onClose();
          }} 
          title={option} 
        />
      ))}
    </Menu>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Text variant="headlineSmall" style={styles.pageTitle}>Settings</Text>

        {/* General Section */}
        <View style={styles.section}>
          <Text variant="titleMedium" style={styles.sectionHeader}>General</Text>
          <SettingRow label="Theme">
            <SelectableSetting 
              value={themeValue}
              options={["System", "Light", "Dark"]}
              visible={themeMenuVisible}
              onOpen={() => setThemeMenuVisible(true)}
              onClose={() => setThemeMenuVisible(false)}
              onSelect={setThemeValue}
            />
          </SettingRow>
          <SettingRow label="Color">
            <SelectableSetting 
              value={colorValue}
              options={["System", "Vivid", "Muted"]}
              visible={colorMenuVisible}
              onOpen={() => setColorMenuVisible(true)}
              onClose={() => setColorMenuVisible(false)}
              onSelect={setColorValue}
            />
          </SettingRow>
          <SettingRow label="Language">
            <SelectableSetting 
              value={langValue}
              options={["System", "English", "Spanish", "French", "German"]}
              visible={langMenuVisible}
              onOpen={() => setLangMenuVisible(true)}
              onClose={() => setLangMenuVisible(false)}
              onSelect={setLangValue}
            />
          </SettingRow>
          <SettingRow label="Animations">
            <View style={[styles.switchBox, { backgroundColor: theme.colors.surfaceVariant }]}>
              <Switch value={animations} onValueChange={setAnimations} color={theme.colors.primary} />
            </View>
          </SettingRow>
        </View>

        {/* Receive Section */}
        <View style={styles.section}>
          <Text variant="titleMedium" style={styles.sectionHeader}>Receive</Text>
          <SettingRow label="Quick Save">
            <View style={[styles.switchBox, { backgroundColor: theme.colors.surfaceVariant }]}>
              <Switch value={quickSave} onValueChange={setQuickSave} />
            </View>
          </SettingRow>
          <SettingRow label='Quick Save for "Favorites"'>
            <View style={[styles.switchBox, { backgroundColor: theme.colors.surfaceVariant }]}>
              <Switch value={quickSaveFav} onValueChange={setQuickSaveFav} />
            </View>
          </SettingRow>
          <SettingRow label="Require PIN">
            <View style={[styles.switchBox, { backgroundColor: theme.colors.surfaceVariant }]}>
              <Switch value={requirePin} onValueChange={setRequirePin} />
            </View>
          </SettingRow>
          <SettingRow label="Save to folder">
            <TonalBox text="(Downloads)" />
          </SettingRow>
          <SettingRow label="Save media to gallery">
            <View style={[styles.switchBox, { backgroundColor: theme.colors.surfaceVariant }]}>
              <Switch value={saveMedia} onValueChange={setSaveMedia} />
            </View>
          </SettingRow>
          <SettingRow label="Auto Finish">
            <View style={[styles.switchBox, { backgroundColor: theme.colors.surfaceVariant }]}>
              <Switch value={autoFinish} onValueChange={setAutoFinish} />
            </View>
          </SettingRow>
          <SettingRow label="Save to history">
            <View style={[styles.switchBox, { backgroundColor: theme.colors.surfaceVariant }]}>
              <Switch value={saveHistory} onValueChange={setSaveHistory} />
            </View>
          </SettingRow>
        </View>

        {/* Network Section */}
        <View style={styles.section}>
          <Text variant="titleMedium" style={styles.sectionHeader}>Network</Text>
          <SettingRow label="Server">
            <View style={[styles.multiIconBox, { backgroundColor: theme.colors.surfaceVariant }]}>
              <IconButton icon="refresh" size={20} style={styles.miniIcon} onPress={() => {}} />
              <IconButton icon="stop" size={20} style={styles.miniIcon} onPress={() => {}} />
            </View>
          </SettingRow>
          <SettingRow label="Device name">
            <TonalBox text="Adorable Pear" />
          </SettingRow>
        </View>

        {/* Other Section */}
        <View style={styles.section}>
          <Text variant="titleMedium" style={styles.sectionHeader}>Other</Text>
          <SettingRow label="About LocalSend">
            <TonalBox text="Open" />
          </SettingRow>
          <SettingRow label="Support LocalSend">
            <TonalBox text="Donate" />
          </SettingRow>
          <SettingRow label="Privacy Policy">
            <TonalBox text="Open" />
          </SettingRow>
        </View>

        {/* Advanced Footer */}
        <View style={styles.footer}>
          <TouchableOpacity 
            style={styles.advancedRow} 
            onPress={() => setAdvanced(!advanced)}
            activeOpacity={1}
          >
            <Text variant="bodyMedium">Advanced settings</Text>
            <Checkbox status={advanced ? "checked" : "unchecked"} />
          </TouchableOpacity>
        </View>
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
  footer: {
    marginTop: 16,
    marginBottom: 40,
    alignItems: "flex-end",
  },
  advancedRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
});
