import React, { useMemo, useEffect, useState, useRef } from "react";
import {
  DarkTheme as NavigationDarkTheme,
  DefaultTheme as NavigationDefaultTheme,
  ThemeProvider,
} from "@react-navigation/native";
import merge from "deepmerge";
import { Stack } from "expo-router";
import {
  MD3DarkTheme,
  MD3LightTheme,
  PaperProvider,
  adaptNavigationTheme,
} from "react-native-paper";

import { ThemeVariations } from "../constants/Colors";
import { ThemeProvider as AppThemeProvider, useAppTheme } from "@/context/ThemeContext";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { SelectionProvider } from "@/hooks/useSelection";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { BottomSheetModalProvider } from "@gorhom/bottom-sheet";
import * as Network from "expo-network";
import * as Device from "expo-device";
import { Platform } from "react-native";
import { useSettingsStore } from "@/store/useSettingsStore";
import { useDiscoveryStore } from "@/store/useDiscoveryStore";
import { Paths, Directory } from "expo-file-system";

function InnerLayout() {
  const { colorScheme, selectedVariation, isLoaded } = useAppTheme();
  
  // Settings Store
  const deviceName = useSettingsStore(state => state.deviceName);
  const deviceId = useSettingsStore(state => state.deviceId);
  const serverRunning = useSettingsStore(state => state.serverRunning);
  const saveToFolderPath = useSettingsStore(state => state.saveToFolderPath);
  const setSaveToFolderPath = useSettingsStore(state => state.setSaveToFolderPath);
  const setDeviceName = useSettingsStore(state => state.setDeviceName);
  const setDeviceId = useSettingsStore(state => state.setDeviceId);

  // Discovery Store
  const setNearbyDevices = useDiscoveryStore(state => state.setNearbyDevices);
  const setIsScanning = useDiscoveryStore(state => state.setIsScanning);
  const nearbyDevices = useDiscoveryStore(state => state.nearbyDevices);
  const scanTrigger = useDiscoveryStore(state => state.scanTrigger);
  
  const knownDesktopIps = useRef<Set<string>>(new Set());

  const paperTheme = useMemo(() => {
    const { LightTheme, DarkTheme } = adaptNavigationTheme({
      reactNavigationLight: NavigationDefaultTheme,
      reactNavigationDark: NavigationDarkTheme,
    });

    const customDarkTheme = { ...MD3DarkTheme, colors: selectedVariation.dark };
    const customLightTheme = { ...MD3LightTheme, colors: selectedVariation.light };

    const CombinedDefaultTheme = merge(LightTheme, customLightTheme);
    const CombinedDarkTheme = merge(DarkTheme, customDarkTheme);

    return colorScheme === "dark" ? CombinedDarkTheme : CombinedDefaultTheme;
  }, [colorScheme, selectedVariation]);

  // Initialization: Default Folder, Name, ID
  useEffect(() => {
    const initializeSettings = async () => {
      // 1. Initialize Default Folder (EXLink)
      if (!saveToFolderPath) {
        try {
          let defaultDir: string;
          if (Platform.OS === 'android') {
            // Attempt to use the root of internal storage (shared storage)
            defaultDir = 'file:///storage/emulated/0/EXLink';
          } else {
            defaultDir = Paths.document.uri + '/EXLink';
          }

          const dir = new Directory(defaultDir);
          try {
            if (!dir.exists) {
              await dir.create();
              console.log("[Layout] Created default folder:", defaultDir);
            }
            setSaveToFolderPath(defaultDir);
          } catch (createErr) {
            console.error("[Layout] Failed to access/create preferred folder:", defaultDir, createErr);
            // Fallback for Android if root is blocked
            if (Platform.OS === 'android' && defaultDir !== Paths.document.uri + '/EXLink') {
              const fallbackDir = Paths.document.uri + '/EXLink';
              const fDir = new Directory(fallbackDir);
              if (!fDir.exists) await fDir.create();
              setSaveToFolderPath(fallbackDir);
              console.log("[Layout] Falling back to internal storage:", fallbackDir);
            }
          }
        } catch (e) {
          console.error("[Layout] Critical folder initialization error:", e);
        }
      }

      // 2. Ensure Name/ID exists
      if (!deviceName || deviceName === "") {
        const name = Device.deviceName || "Mobile Device";
        setDeviceName(name);
      }
      
      if (!deviceId || deviceId === "") {
        const myIp = await Network.getIpAddressAsync();
        const id = (myIp && myIp.includes('.')) ? myIp.split('.').pop()! : "000";
        setDeviceId(id);
      }
    };
    
    initializeSettings();
  }, [saveToFolderPath, deviceName, deviceId]);

  // Global Discovery Service
  useEffect(() => {
    // Don't start discovery until we have identity and server is intended to run
    if (!serverRunning || !deviceName || !deviceId) return;

    const announceToIps = async (ips: Set<string>) => {
      try {
        const myIp = await Network.getIpAddressAsync();
        if (!myIp || myIp.includes(':')) return;

        const brand = Device.brand || Device.modelName || "Mobile";
        
        for (const desktopIp of ips) {
          fetch(`http://${desktopIp}:3030/announce`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              id: deviceId,
              name: deviceName,
              ip: myIp,
              port: 3030,
              platform: 'mobile',
              brand: brand
            })
          }).catch(() => {
            // If it fails repeatedly, we could consider it dead, but common for desktop to go sleep
          });
        }
      } catch (e) {}
    };

    const scanSubnet = async () => {
      try {
        const myIp = await Network.getIpAddressAsync();
        if (!myIp || myIp.includes(':')) return;
        
        setIsScanning(true);
        const subnet = myIp.substring(0, myIp.lastIndexOf('.') + 1);
        const candidates = Array.from({ length: 254 }, (_, i) => i + 1);
        const batchSize = 35; // Slightly smaller batch for better stability
        
        const foundDevices: any[] = [];

        for (let i = 0; i < candidates.length; i += batchSize) {
          const batch = candidates.slice(i, i + batchSize);
          await Promise.all(batch.map(async (suffix) => {
            const testIp = subnet + suffix;
            if (testIp === myIp) return;
            try {
              const controller = new AbortController();
              const timeout = setTimeout(() => controller.abort(), 800); // Increased timeout
              const res = await fetch(`http://${testIp}:3030/get-server-info`, { 
                signal: controller.signal,
                headers: { 'Accept': 'application/json' }
              });
              clearTimeout(timeout);
              if (res.ok) {
                const info = await res.json();
                foundDevices.push(info);
                knownDesktopIps.current.add(testIp);
              }
            } catch (e) {}
          }));
        }
        
        setNearbyDevices(foundDevices);
        setIsScanning(false);
        
        if (knownDesktopIps.current.size > 0) {
          announceToIps(knownDesktopIps.current);
        }
      } catch (e) {
        setIsScanning(false);
      }
    };

    // Initial scan and announce
    scanSubnet();

    const announceInterval = setInterval(() => {
      if (knownDesktopIps.current.size > 0) {
        announceToIps(knownDesktopIps.current);
      }
    }, 10000);

    const scanInterval = setInterval(scanSubnet, 45000);

    return () => {
      clearInterval(announceInterval);
      clearInterval(scanInterval);
    };
  }, [serverRunning, deviceName, deviceId, scanTrigger]);

  if (!isLoaded) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: paperTheme.colors.background }}>
      <SafeAreaProvider>
        <StatusBar style={colorScheme === "dark" ? "light" : "dark"} />
        <SelectionProvider>
          <BottomSheetModalProvider>
            <PaperProvider theme={paperTheme}>
              <ThemeProvider value={paperTheme}>
                <Stack screenOptions={{ headerShown: false }}>
                  <Stack.Screen name="(tabs)" />
                </Stack>
              </ThemeProvider>
            </PaperProvider>
          </BottomSheetModalProvider>
        </SelectionProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

export default function RootLayout() {
  return (
    <AppThemeProvider>
      <InnerLayout />
    </AppThemeProvider>
  );
}
