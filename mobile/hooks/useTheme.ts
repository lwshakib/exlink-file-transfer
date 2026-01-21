import { useState, useEffect } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useColorScheme } from "react-native";
import { ThemeVariations } from "../constants/Colors";

export type ColorTheme = "LocalSend" | "Emerald" | "Violet" | "Blue" | "Amber" | "Rose" | "Random";

export const useTheme = () => {
  const systemColorScheme = useColorScheme();
  const [colorScheme, setColorScheme] = useState<"light" | "dark">(systemColorScheme || "dark");
  const [selectedColor, setSelectedColor] = useState<ColorTheme>("LocalSend");
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    const loadTheme = async () => {
      try {
        const savedScheme = await AsyncStorage.getItem("colorScheme");
        const savedColor = await AsyncStorage.getItem("selectedColor");

        if (savedScheme) {
          setColorScheme(savedScheme as any);
        } else {
            setColorScheme(systemColorScheme || "dark");
        }

        if (savedColor) {
          setSelectedColor(savedColor as ColorTheme);
        }
      } catch (e) {
        console.error("Failed to load theme", e);
      } finally {
        setIsLoaded(true);
      }
    };

    loadTheme();
  }, [systemColorScheme]);

  const setThemeScheme = async (scheme: "light" | "dark" | "system") => {
    let resolved = scheme === "system" ? (systemColorScheme || "dark") : scheme;
    setColorScheme(resolved);
    if (scheme === "system") {
        await AsyncStorage.removeItem("colorScheme");
    } else {
        await AsyncStorage.setItem("colorScheme", scheme);
    }
  };

  const setThemeColor = async (color: ColorTheme) => {
    setSelectedColor(color);
    await AsyncStorage.setItem("selectedColor", color);
  };

  const toggleTheme = () => {
    const newScheme = colorScheme === "light" ? "dark" : "light";
    setThemeScheme(newScheme);
  };

  // Logic to determine which variation to use
  const getSelectedVariation = () => {
    if (selectedColor === "Random") {
      return null;
    }
    return ThemeVariations.find(v => v.name === selectedColor) || ThemeVariations[0];
  };

  return { 
    toggleTheme, 
    colorScheme, 
    setThemeScheme, 
    selectedColor, 
    setThemeColor,
    getSelectedVariation,
    isLoaded 
  };
};
