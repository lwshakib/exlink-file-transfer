// Import React hooks necessary for context creation, state management, side effects, and memoization
import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';
// Import the settings store to access user theme preferences
import { useSettingsStore } from '../store/useSettingsStore';
// Import useColorScheme from react-native to detect system OS theme (light/dark mode)
import { useColorScheme } from 'react-native';
// Import predefined theme variations (e.g., ExLink, Emerald, etc.) from the constants file
import { ThemeVariations } from '../constants/Colors';

// Define the available literal types for our accent colors
export type ColorTheme = 'ExLink' | 'Emerald' | 'Violet' | 'Blue' | 'Amber' | 'Rose' | 'Random';

// Define the shape of our Theme Context, mapping out what values/functions are provided to components
interface ThemeContextType {
  colorScheme: 'light' | 'dark'; // The active base mode (light vs dark) computed from user setting or system
  selectedColor: ColorTheme; // The selected accent color name
  setThemeScheme: (scheme: 'light' | 'dark' | 'system') => Promise<void>; // Function to update base mode
  setThemeColor: (color: ColorTheme) => Promise<void>; // Function to update accent color
  toggleTheme: () => void; // Function to quickly switch between light and dark
  isLoaded: boolean; // Flag to indicate if the theme data has hydrated from storage
  selectedVariation: any; // The actual object holding hex/rgba color values for the active theme
}

// Create the React Context, default is undefined before the provider wraps the app
const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

// Define the Provider component which encapsulates the state logic and wraps the app subtree
export function ThemeProvider({ children }: { children: React.ReactNode }) {
  // Hook into the device's native OS theme preference
  const systemColorScheme = useColorScheme();

  // Retrieve states and actions from our global zustand Settings store
  const colorSchemeSetting = useSettingsStore((state) => state.colorScheme);
  const selectedColor = useSettingsStore((state) => state.selectedColor);
  const setColorSchemeStore = useSettingsStore((state) => state.setColorScheme);
  const setSelectedColorStore = useSettingsStore((state) => state.setSelectedColor);

  // Local state to track hydration status
  const [isLoaded, setIsLoaded] = useState(false);
  // Local state used for generating a pseudo-random theme index when 'Random' is selected
  const [randomVariationIndex, setRandomVariationIndex] = useState(0);

  // Compute the actual base color scheme ('light' or 'dark') based on the setting value
  // If the setting is 'system', we map it to the OS theme. Otherwise, we enforce the setting.
  const colorScheme = useMemo(() => {
    if (colorSchemeSetting === 'system') {
      return systemColorScheme || 'dark'; // Fallback to dark if system cannot decide
    }
    return colorSchemeSetting as 'light' | 'dark';
  }, [colorSchemeSetting, systemColorScheme]); // Recompute when settings or system theme changes

  // Effect simulating checking standard hydration completion (zustand persistence)
  useEffect(() => {
    const checkHydration = async () => {
      // Small pause logic could go here to guarantee storage reads,
      // but synchronously marking it true handles general initial loads well.
      setIsLoaded(true);
    };
    checkHydration();
  }, []); // Empty dependency array means this runs only once on mount

  // Effect to assign a new random theme variation every time 'Random' is selected
  useEffect(() => {
    if (selectedColor === 'Random') {
      // Pick a random number up to the length of our available variations array
      setRandomVariationIndex(Math.floor(Math.random() * ThemeVariations.length));
    }
  }, [selectedColor]); // Triggers whenever selectedColor setting changes

  // Helper function to update the global user preference for base mode
  const setThemeScheme = async (scheme: 'light' | 'dark' | 'system') => {
    setColorSchemeStore(scheme);
  };

  // Helper function to update the global user preference for the accent color
  const setThemeColor = async (color: ColorTheme) => {
    setSelectedColorStore(color as any);
  };

  // Quick toggle helper for reversing the light/dark mode based on the current active state
  const toggleTheme = () => {
    const newScheme = colorScheme === 'light' ? 'dark' : 'light';
    setThemeScheme(newScheme);
  };

  // Derived state that memoizes the full palette object needed by styled elements
  // Finds the variation that strictly matches the selected brand string name.
  const selectedVariation = useMemo(() => {
    // Return early with defaults if not fully loaded yet
    if (!isLoaded) return ThemeVariations[0]; 
    if (selectedColor === 'Random') {
      // Provide the randomly selected index variation
      return ThemeVariations[randomVariationIndex];
    }
    // Attempt to match the array object by name, falling back to the default ExLink
    return ThemeVariations.find((v) => v.name === selectedColor) || ThemeVariations[0];
  }, [selectedColor, randomVariationIndex, isLoaded]);

  // Return the actual provider wrapper passing all contextual values
  return (
    <ThemeContext.Provider
      value={{
        colorScheme, // Computed mode
        selectedColor, // Name of accent
        setThemeScheme, // Update mode function
        setThemeColor, // Update accent function
        toggleTheme, // Toggle mode function
        isLoaded, // Status flag
        selectedVariation, // The full color map object
      }}
    >
      {/* Exposes context to descendants */}
      {children}
    </ThemeContext.Provider>
  );
}

// Custom specialized hook to easily consume the Theme Context throughout components
export function useAppTheme() {
  const context = useContext(ThemeContext);
  // Guarantee it's correctly scoped inside the tree
  if (context === undefined) {
    throw new Error('useAppTheme must be used within a ThemeProvider');
  }
  return context;
}
