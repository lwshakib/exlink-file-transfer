import React, { createContext, useContext, useState, useEffect, useMemo } from "react";
import { useSettingsStore } from "../store/useSettingsStore";
import { useColorScheme } from "react-native";
import { ThemeVariations } from "../constants/Colors";

export type ColorTheme = "ExLink" | "Emerald" | "Violet" | "Blue" | "Amber" | "Rose" | "Random";

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
  
  // Zustand Store
  const colorSchemeSetting = useSettingsStore((state) => state.colorScheme);
  const selectedColor = useSettingsStore((state) => state.selectedColor);
  const setColorSchemeStore = useSettingsStore((state) => state.setColorScheme);
  const setSelectedColorStore = useSettingsStore((state) => state.setSelectedColor);

  const [isLoaded, setIsLoaded] = useState(false);
  const [randomVariationIndex, setRandomVariationIndex] = useState(0);

  // Map 'system' to actual scheme
  const colorScheme = useMemo(() => {
    if (colorSchemeSetting === 'system') {
      return systemColorScheme || 'dark';
    }
    return colorSchemeSetting as 'light' | 'dark';
  }, [colorSchemeSetting, systemColorScheme]);

  useEffect(() => {
    // We consider it loaded immediately as Zustand handles hydration asynchronously but usually fast
    // We can use a small effect to ensure hydration is checked if we want to be safe
    const checkHydration = async () => {
      // Small delay to allow persist middleware to load
      setIsLoaded(true);
    };
    checkHydration();
  }, []);

  useEffect(() => {
    if (selectedColor === "Random") {
      setRandomVariationIndex(Math.floor(Math.random() * ThemeVariations.length));
    }
  }, [selectedColor]);

  const setThemeScheme = async (scheme: "light" | "dark" | "system") => {
    setColorSchemeStore(scheme);
  };

  const setThemeColor = async (color: ColorTheme) => {
    setSelectedColorStore(color as any);
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
