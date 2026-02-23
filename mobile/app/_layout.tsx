import React, { useMemo, useEffect, useRef } from 'react';
import {
  DarkTheme as NavigationDarkTheme,
  DefaultTheme as NavigationDefaultTheme,
  ThemeProvider,
} from '@react-navigation/native';
import merge from 'deepmerge';
import { Stack } from 'expo-router';
import {
  MD3DarkTheme,
  MD3LightTheme,
  PaperProvider,
  adaptNavigationTheme,
} from 'react-native-paper';

import { ThemeProvider as AppThemeProvider, useAppTheme } from '@/context/ThemeContext';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { SelectionProvider } from '@/hooks/useSelection';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { BottomSheetModalProvider } from '@gorhom/bottom-sheet';
import * as Network from 'expo-network';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import { useSettingsStore } from '@/store/useSettingsStore';
import { useDiscoveryStore } from '@/store/useDiscoveryStore';
import { Paths, Directory } from 'expo-file-system';

// InnerLayout configures and manages the app's fundamental operations: theming, storage prep, and peer-to-peer device discovery
function InnerLayout() {
  // Extract custom theming states from our global Context wrapper
  const { colorScheme, selectedVariation, isLoaded } = useAppTheme();

  // --- Settings Store Connectors ---
  // Device identity strings configured dynamically
  const deviceName = useSettingsStore((state) => state.deviceName);
  const deviceId = useSettingsStore((state) => state.deviceId);
  // Setting determining whether this device broadcasts itself to the local network
  const serverRunning = useSettingsStore((state) => state.serverRunning);
  // The destination folder chosen by the user or the operating system
  const saveToFolderPath = useSettingsStore((state) => state.saveToFolderPath);
  const setSaveToFolderPath = useSettingsStore((state) => state.setSaveToFolderPath);
  const setDeviceName = useSettingsStore((state) => state.setDeviceName);
  const setDeviceId = useSettingsStore((state) => state.setDeviceId);

  // --- Discovery Store Connectors ---
  // Actions and state flags tracking nearby nodes running the same application
  const setNearbyDevices = useDiscoveryStore((state) => state.setNearbyDevices);
  const setIsScanning = useDiscoveryStore((state) => state.setIsScanning);
  const scanTrigger = useDiscoveryStore((state) => state.scanTrigger); // A numeric toggle to force scans

  // Mutable ref used to hold a persisting list of discovered peers without triggering React re-renders on updates
  const knownDesktopIps = useRef<Set<string>>(new Set());

  // Memoize theme combinations between Material Design 3 and React Navigation configurations
  const paperTheme = useMemo(() => {
    // Generates navigation themes accurately mapped to React Native Paper colors
    const { LightTheme, DarkTheme } = adaptNavigationTheme({
      reactNavigationLight: NavigationDefaultTheme,
      reactNavigationDark: NavigationDarkTheme,
    });

    // Merge standard configurations with our custom color palettes from Colors.ts
    const customDarkTheme = { ...MD3DarkTheme, colors: selectedVariation.dark };
    const customLightTheme = { ...MD3LightTheme, colors: selectedVariation.light };

    // Deep merge both library themes so UI components share one true color map universally
    const CombinedDefaultTheme = merge(LightTheme, customLightTheme);
    const CombinedDarkTheme = merge(DarkTheme, customDarkTheme);

    // Swap strictly depending on user setting (light/dark/system mapped to actual literal strings before this stage)
    return colorScheme === 'dark' ? CombinedDarkTheme : CombinedDefaultTheme;
  }, [colorScheme, selectedVariation]);

  // Initialization Hook: Boots up core app states like storage locations and device names
  useEffect(() => {
    const initializeSettings = async () => {
      // 1. Initialize Default File Folder path mapped to 'EXLink'
      if (!saveToFolderPath) {
        try {
          let defaultDir: string;
          // Setup primary path behavior depending on iOS or Android filesystem abstractions
          if (Platform.OS === 'android') {
            // Attempt to use the root of internal storage (shared storage accessible to file managers natively)
            defaultDir = 'file:///storage/emulated/0/EXLink';
          } else {
            // Document directory scope is forced on iOS environments
            defaultDir = Paths.document.uri + '/EXLink';
          }

          // Use expo-file-system abstraction targeting this URL
          const dir = new Directory(defaultDir);
          try {
            if (!dir.exists) {
              await dir.create(); // Create physical OS folder if lacking
              console.log('[Layout] Created default folder:', defaultDir);
            }
            // Bind default to Zustand if successful
            setSaveToFolderPath(defaultDir);
          } catch (createErr) {
            console.error(
              '[Layout] Failed to access/create preferred folder:',
              defaultDir,
              createErr
            );
            // Fallback exclusively for Android if root scoped storage is heavily restricted dynamically by OS
            if (Platform.OS === 'android' && defaultDir !== Paths.document.uri + '/EXLink') {
              const fallbackDir = Paths.document.uri + '/EXLink';
              const fDir = new Directory(fallbackDir);
              if (!fDir.exists) await fDir.create();
              setSaveToFolderPath(fallbackDir);
              console.log('[Layout] Falling back to internal storage:', fallbackDir);
            }
          }
        } catch (e) {
          console.error('[Layout] Critical folder initialization error:', e);
        }
      }

      // 2. Ensure Name and ID states are instantiated properly on first load
      if (!deviceName || deviceName === '') {
        // Fallback sequentially down Native device string properties
        const name = Device.deviceName || 'Mobile Device';
        setDeviceName(name);
      }

      if (!deviceId || deviceId === '') {
        // ID generation based on the octet string of the active LAN IPv4 Address
        const myIp = await Network.getIpAddressAsync();
        const id = myIp && myIp.includes('.') ? myIp.split('.').pop()! : '000';
        setDeviceId(id);
      }
    };

    initializeSettings();
  }, [saveToFolderPath, deviceName, deviceId, setDeviceId, setDeviceName, setSaveToFolderPath]);

  // Global Discovery Service Hook: Background worker constantly probing subnet for transfer counterparts
  useEffect(() => {
    // Gate logic: Do not broadcast network pings if the backend shouldn't run or profile is uninitialized
    if (!serverRunning || !deviceName || !deviceId) return;

    // Helper notifying target devices that our identity is alive mapped directly to them via POST
    const announceToIps = async (ips: Set<string>) => {
      try {
        const myIp = await Network.getIpAddressAsync();
        // Skip operations if IP fetch fails or IPv6 format slips through explicitly
        if (!myIp || myIp.includes(':')) return;

        const brand = Device.brand || Device.modelName || 'Mobile';

        // Ping discovered subset
        for (const desktopIp of ips) {
          fetch(`http://${desktopIp}:3030/announce`, {
            method: 'POST', // Handshake payload
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              id: deviceId, // Our id
              name: deviceName, // Our public name
              ip: myIp, // Formatted host
              port: 3030, // Default app binding
              platform: 'mobile',
              brand: brand,
            }),
          }).catch(() => {
            // Intentionally swallowed, targets often drop off Wi-Fi silently between updates
          });
        }
      } catch {}
    };

    // Primary sweeping subnet logic iterating IP offsets 1...254 and hitting a discovery endpoint concurrently
    const scanSubnet = async () => {
      try {
        const myIp = await Network.getIpAddressAsync();
        if (!myIp || myIp.includes(':')) return;

        setIsScanning(true); // Fire up UI spinner hooks universally
        // Grab subnet prefix (like 192.168.0.)
        const subnet = myIp.substring(0, myIp.lastIndexOf('.') + 1);
        const candidates = Array.from({ length: 254 }, (_, i) => i + 1);
        // Dispatch concurrent promise blasts in batches mapping async network calls to avoid hitting OS limits
        const batchSize = 35;

        const foundDevices: any[] = [];

        // Loop synchronously over batched chunks dynamically to pace network congestion effectively
        for (let i = 0; i < candidates.length; i += batchSize) {
          const batch = candidates.slice(i, i + batchSize);
          await Promise.all(
            batch.map(async (suffix) => {
              const testIp = subnet + suffix; // Reconstruct a specific target string
              // Ignore hitting the device calling the script
              if (testIp === myIp) return;
              try {
                // Short lived controllers to cancel dead sockets forcefully accelerating scans
                const controller = new AbortController();
                const timeout = setTimeout(() => controller.abort(), 800);
                // GET request asking abstract info off the hard-coded standard socket 3030
                const res = await fetch(`http://${testIp}:3030/get-server-info`, {
                  signal: controller.signal,
                  headers: { Accept: 'application/json' },
                });
                clearTimeout(timeout); // Clear abort event if fetch beat it

                // Server responded and parsed valid handshake correctly
                if (res.ok) {
                  const info = await res.json();
                  foundDevices.push(info);
                  knownDesktopIps.current.add(testIp); // Cache explicitly without throwing state change
                }
              } catch {} // Swallowed silently given timeouts are intended failure paths
            })
          );
        }

        // Output completely found bulk list to central state directly altering UI layers tracking lists globally
        setNearbyDevices(foundDevices);
        setIsScanning(false); // Drop scan flag dynamically

        // Fire implicit connection handshakes backward securely indicating bi-directional access logic
        if (knownDesktopIps.current.size > 0) {
          announceToIps(knownDesktopIps.current);
        }
      } catch {
        setIsScanning(false);
      }
    };

    // Trigger sequential scan explicitly when component logic originally mounts fully into reality
    scanSubnet();

    // Re-ping discovered list frequently helping connections establish safely when devices roam or wake
    const announceInterval = setInterval(() => {
      if (knownDesktopIps.current.size > 0) {
        announceToIps(knownDesktopIps.current);
      }
    }, 10000);

    // Heavy subnet sweeps scheduled on long frequencies capturing completely new dynamic entries
    const scanInterval = setInterval(scanSubnet, 45000);

    // Standard unmount effect dropping active timeouts explicitly preventing heavy leaks
    return () => {
      clearInterval(announceInterval);
      clearInterval(scanInterval);
    };
  }, [serverRunning, deviceName, deviceId, scanTrigger, setIsScanning, setNearbyDevices]); // Listens explicitly to scanTrigger allowing manual user forced rescans remotely

  // Blocking logic rendering null securely holding render cycle fully preventing state mismatch before contexts establish
  if (!isLoaded) return null;

  return (
    // Wrap entire DOM securely supporting fluid complex gesture logic implicitly
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: paperTheme.colors.background }}>
      {/* SafeArea wrapper to dynamically measure and account for hardware notches padding components */}
      <SafeAreaProvider>
        {/* Syncs actual phone indicator time/battery styles to opposite of background contrast automatically */}
        <StatusBar style={colorScheme === 'dark' ? 'light' : 'dark'} />
        {/* Core Provider wrappers defining context scopes spanning whole DOM generically */}
        <SelectionProvider>
          <BottomSheetModalProvider>
            <PaperProvider theme={paperTheme}>
              {/* Fallback legacy navigation theming hook directly linked ensuring universal consistency abstractly */}
              <ThemeProvider value={paperTheme}>
                {/* Mount internal Expo Router explicitly hooking '(tabs)' directly */}
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

// Entry component implicitly run when application invokes providing our lowest level Theme Provider hook
export default function RootLayout() {
  return (
    <AppThemeProvider>
      <InnerLayout />
    </AppThemeProvider>
  );
}
