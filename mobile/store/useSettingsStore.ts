// Import 'create' from zustand for creating a global state store
import { create } from 'zustand';
// Import persistence middlewares to auto-save state to local storage
import { persist, createJSONStorage } from 'zustand/middleware';
// Use AsyncStorage from React Native for saving persisted data
import AsyncStorage from '@react-native-async-storage/async-storage';

// Interface representing a single file transfer record in history
export interface HistoryItem {
  id: string; // Unique identifier for the history entry
  name: string; // Name of the transferred file
  size: number; // Size in bytes
  timestamp: number; // Unix timestamp showing when it occurred
  from?: string; // Optional origin device name or IP
}

// Definition of all settings available in the app
export interface AppSettings {
  // --- Device Settings ---
  deviceName: string; // Local device name visible to others
  deviceId: string; // Unique ID used for device discovery
  serverRunning: boolean; // Indicates if the backend transfer server is active

  // --- File Transfer Settings ---
  saveToFolderPath: string | null; // Selected custom directory for received files
  saveMediaToGallery: boolean; // Flag to auto-save images/videos to native gallery

  // --- History ---
  transferHistory: HistoryItem[]; // List of recent transfers

  // --- Theme Settings ---
  colorScheme: 'system' | 'light' | 'dark'; // Base theme mode
  // The primary accent color for the UI
  selectedColor: 'ExLink' | 'Emerald' | 'Violet' | 'Blue' | 'Amber' | 'Rose' | 'Random';
}

// Full store shape including both state (AppSettings) and actions mapped to them
interface AppSettingsStore extends AppSettings {
  // Actions to mutate specific states
  setDeviceName: (name: string) => void; // Updates device name
  setDeviceId: (id: string) => void; // Updates device ID
  setServerRunning: (running: boolean) => void; // Toggles server background run status
  setSaveToFolderPath: (path: string | null) => void; // Updates download path
  setSaveMediaToGallery: (save: boolean) => void; // Toggles media auto-save
  addHistoryItem: (item: HistoryItem) => void; // Pushes a new history item
  clearHistory: () => void; // Clears the transfer history
  setColorScheme: (scheme: 'system' | 'light' | 'dark') => void; // Changes base color mode
  setSelectedColor: (
    color: 'ExLink' | 'Emerald' | 'Violet' | 'Blue' | 'Amber' | 'Rose' | 'Random'
  ) => void; // Changes color accent

  // Utility to revert store back to default settings
  reset: () => void;
}

// Define the default/fallback state values
const initialSettings: AppSettings = {
  deviceName: '', // Empty initially, setup flow handles assigning it
  deviceId: '', // Empty initially, mapped with an ID on start
  serverRunning: true, // Default to having the server run
  saveToFolderPath: null, // Initialized in _layout.tsx based on platform behavior
  saveMediaToGallery: true, // Auto-save to gallery defaults to true
  transferHistory: [], // Empty history
  colorScheme: 'system', // Follow system OS dark/light mode preference
  selectedColor: 'ExLink', // Default brand accent color
};

// Create the Settings store using both 'create' and the 'persist' middleware
export const useSettingsStore = create<AppSettingsStore>()(
  persist(
    (set, get) => ({
      // Spread the initial default state over the root
      ...initialSettings,

      // State updaters using zustand set() function
      setDeviceName: (name: string) => set({ deviceName: name }),
      setDeviceId: (id: string) => set({ deviceId: id }),
      setServerRunning: (running: boolean) => set({ serverRunning: running }),
      setSaveToFolderPath: (path: string | null) => set({ saveToFolderPath: path }),
      setSaveMediaToGallery: (save: boolean) => set({ saveMediaToGallery: save }),
      
      // Append item to history, but slice to keep only the 100 most recent
      addHistoryItem: (item: HistoryItem) =>
        set((state) => ({
          transferHistory: [...state.transferHistory, item].slice(-100), // Keep last 100 items to save storage
        })),
        
      // Overwrite history with an empty array
      clearHistory: () => set({ transferHistory: [] }),
      
      // Update theme preferences
      setColorScheme: (scheme: 'system' | 'light' | 'dark') => set({ colorScheme: scheme }),
      setSelectedColor: (
        color: 'ExLink' | 'Emerald' | 'Violet' | 'Blue' | 'Amber' | 'Rose' | 'Random'
      ) => set({ selectedColor: color }),

      // Action implementation reverting everything strictly to basic configurations
      reset: () => set(initialSettings),
    }),
    {
      // Configuration for persistence middleware
      name: 'exlink-settings', // Under what key it gets saved in AsyncStorage
      storage: createJSONStorage(() => AsyncStorage), // Define custom storage mechanism
      // Ensure only valid state properties get persisted, skipping any actions
      partialize: (state) => ({
        deviceName: state.deviceName,
        deviceId: state.deviceId,
        serverRunning: state.serverRunning,
        saveToFolderPath: state.saveToFolderPath,
        saveMediaToGallery: state.saveMediaToGallery,
        transferHistory: state.transferHistory,
        colorScheme: state.colorScheme,
        selectedColor: state.selectedColor,
      }),
    }
  )
);

// Helpful selectors pre-bound for easier imports inside components.
// Example: const name = useSettingsStore(selectDeviceName)
export const selectDeviceName = (state: AppSettingsStore) => state.deviceName;
export const selectDeviceId = (state: AppSettingsStore) => state.deviceId;
export const selectServerRunning = (state: AppSettingsStore) => state.serverRunning;
export const selectSaveToFolderPath = (state: AppSettingsStore) => state.saveToFolderPath;
export const selectSaveMediaToGallery = (state: AppSettingsStore) => state.saveMediaToGallery;
export const selectTransferHistory = (state: AppSettingsStore) => state.transferHistory;
export const selectColorScheme = (state: AppSettingsStore) => state.colorScheme;
export const selectSelectedColor = (state: AppSettingsStore) => state.selectedColor;
