import React, { useMemo, useEffect, useState } from "react";
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
import AsyncStorage from "@react-native-async-storage/async-storage";

function InnerLayout() {
  const { colorScheme, selectedVariation, isLoaded } = useAppTheme();
  
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

  // Global Discovery Service
  useEffect(() => {
    let knownDesktopIps = new Set<string>();
    let serverRunning = true;
    
    // Auto-start server on app launch as requested
    AsyncStorage.setItem("serverRunning", "true");

    const checkServerStatus = async () => {
      const status = await AsyncStorage.getItem("serverRunning");
      serverRunning = status !== "false";
    };
    
    const announceToIps = async (ips: Set<string>) => {
      await checkServerStatus();
      if (!serverRunning) return;
      
      try {
        const myIp = await Network.getIpAddressAsync();
        if (!myIp || myIp.includes(':')) return;

        const brand = Device.brand || Device.modelName || "Mobile";
        const storedName = await AsyncStorage.getItem("deviceName");
        const name = storedName || Device.deviceName || "Mobile Device";
        const storedId = await AsyncStorage.getItem("deviceId");
        
        // Use IP suffix as default ID if none stored, matching desktop logic
        const id = storedId || (myIp.includes('.') ? myIp.split('.').pop()! : "000");

        for (const desktopIp of ips) {
          fetch(`http://${desktopIp}:3030/announce`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              id: id,
              name: name,
              ip: myIp,
              port: 3030,
              platform: 'mobile',
              brand: brand
            })
          }).catch(() => {
              knownDesktopIps.delete(desktopIp);
          });
        }
      } catch (e) {}
    };

    const scanSubnet = async () => {
      try {
        const myIp = await Network.getIpAddressAsync();
        if (!myIp || myIp.includes(':')) return;
        
        const subnet = myIp.substring(0, myIp.lastIndexOf('.') + 1);
        const candidates = Array.from({ length: 254 }, (_, i) => i + 1);
        const batchSize = 40;

        for (let i = 0; i < candidates.length; i += batchSize) {
          const batch = candidates.slice(i, i + batchSize);
          await Promise.all(batch.map(async (suffix) => {
            const testIp = subnet + suffix;
            if (testIp === myIp) return;
            try {
              const controller = new AbortController();
              const timeout = setTimeout(() => controller.abort(), 400);
              const res = await fetch(`http://${testIp}:3030/get-server-info`, { signal: controller.signal });
              clearTimeout(timeout);
              if (res.ok) {
                knownDesktopIps.add(testIp);
              }
            } catch (e) {}
          }));
        }
        if (knownDesktopIps.size > 0) announceToIps(knownDesktopIps);
      } catch (e) {}
    };

    scanSubnet();

    const announceInterval = setInterval(async () => {
        await checkServerStatus();
        if (serverRunning && knownDesktopIps.size > 0) announceToIps(knownDesktopIps);
    }, 10000);

    const scanInterval = setInterval(scanSubnet, 45000);

    return () => {
      clearInterval(announceInterval);
      clearInterval(scanInterval);
    };
  }, []);

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
