import React, { useMemo } from "react";
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
import { useTheme } from "@/hooks/useTheme";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { SelectionProvider } from "@/hooks/useSelection";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { BottomSheetModalProvider } from "@gorhom/bottom-sheet";

export default function RootLayout() {
  const { colorScheme } = useTheme();

  // Select a random theme once on mount
  const selectedVariation = useMemo(() => {
    const index = Math.floor(Math.random() * ThemeVariations.length);
    return ThemeVariations[index];
  }, []);

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
                  <Stack.Screen name="history" />
                  <Stack.Screen name="selection-details" />
                  <Stack.Screen 
                    name="sending" 
                    options={{ 
                      presentation: 'modal',
                      animation: 'fade_from_bottom' 
                    }} 
                  />
                </Stack>
              </ThemeProvider>
            </PaperProvider>
          </BottomSheetModalProvider>
        </SelectionProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
