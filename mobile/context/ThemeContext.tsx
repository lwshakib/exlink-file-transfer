import React, { createContext, useContext, useState, useEffect, useMemo } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useColorScheme } from "react-native";
import { ThemeVariations } from "../constants/Colors";

export type ColorTheme = "LocalSend" | "Emerald" | "Violet" | "Blue" | "Amber" | "Rose" | "Random";

interface ThemeContextType {
  colorScheme: "light" | "dark";
  selectedColor: ColorTheme;
  setThemeScheme: (scheme: "light" | "dark" | "system") => Promise<void>;
  setThemeColor: (color: ColorTheme) => Promise<void>;
  toggleTheme: () => void;
  isLoaded: boolean;
  selectedVariation: any;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const systemColorScheme = useColorScheme();
  const [colorScheme, setColorScheme] = useState<"light" | "dark">("dark");
  const [selectedColor, setSelectedColor] = useState<ColorTheme>("LocalSend");
  const [isLoaded, setIsLoaded] = useState(false);
  const [randomVariationIndex, setRandomVariationIndex] = useState(0);

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
          if (savedColor === "Random") {
            setRandomVariationIndex(Math.floor(Math.random() * ThemeVariations.length));
          }
        }
      } catch (e) {
        console.error("Failed to load theme", e);
      } finally {
        setIsLoaded(true);
      }
    };

    loadTheme();
  }, [systemColorScheme]);

  useEffect(() => {
    if (selectedColor === "Random") {
      setRandomVariationIndex(Math.floor(Math.random() * ThemeVariations.length));
    }
  }, [selectedColor]);

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

  const selectedVariation = useMemo(() => {
    if (!isLoaded) return ThemeVariations[0];
    if (selectedColor === "Random") {
      return ThemeVariations[randomVariationIndex];
    }
    return ThemeVariations.find(v => v.name === selectedColor) || ThemeVariations[0];
  }, [selectedColor, randomVariationIndex, isLoaded]);

  return (
    <ThemeContext.Provider
      value={{
        colorScheme,
        selectedColor,
        setThemeScheme,
        setThemeColor,
        toggleTheme,
        isLoaded,
        selectedVariation
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
}

export function useAppTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error("useAppTheme must be used within a ThemeProvider");
  }
  return context;
}
