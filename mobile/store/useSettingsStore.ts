import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface HistoryItem {
  id: string;
  name: string;
  size: number;
  timestamp: number;
  from?: string;
}

export interface AppSettings {
  // Device Settings
  deviceName: string;
  deviceId: string;
  serverRunning: boolean;

  // File Transfer Settings
  saveToFolderPath: string | null;
  saveMediaToGallery: boolean;
  
  // History
  transferHistory: HistoryItem[];

  // Theme Settings
  colorScheme: 'system' | 'light' | 'dark';
  selectedColor: 'ExLink' | 'Emerald' | 'Violet' | 'Blue' | 'Amber' | 'Rose' | 'Random';
}

interface AppSettingsStore extends AppSettings {
  // Actions
  setDeviceName: (name: string) => void;
  setDeviceId: (id: string) => void;
  setServerRunning: (running: boolean) => void;
  setSaveToFolderPath: (path: string | null) => void;
  setSaveMediaToGallery: (save: boolean) => void;
  addHistoryItem: (item: HistoryItem) => void;
  clearHistory: () => void;
  setColorScheme: (scheme: 'system' | 'light' | 'dark') => void;
  setSelectedColor: (color: 'ExLink' | 'Emerald' | 'Violet' | 'Blue' | 'Amber' | 'Rose' | 'Random') => void;
  
  // Utility
  reset: () => void;
}

const initialSettings: AppSettings = {
  deviceName: '',
  deviceId: '',
  serverRunning: true,
  saveToFolderPath: null, // Initialized in _layout.tsx
  saveMediaToGallery: true,
  transferHistory: [],
  colorScheme: 'system',
  selectedColor: 'ExLink',
};

export const useSettingsStore = create<AppSettingsStore>()(
  persist(
    (set, get) => ({
      ...initialSettings,

      setDeviceName: (name: string) => set({ deviceName: name }),
      setDeviceId: (id: string) => set({ deviceId: id }),
      setServerRunning: (running: boolean) => set({ serverRunning: running }),
      setSaveToFolderPath: (path: string | null) => set({ saveToFolderPath: path }),
      setSaveMediaToGallery: (save: boolean) => set({ saveMediaToGallery: save }),
      addHistoryItem: (item: HistoryItem) => set((state) => ({ 
        transferHistory: [...state.transferHistory, item].slice(-100) // Keep last 100 items
      })),
      clearHistory: () => set({ transferHistory: [] }),
      setColorScheme: (scheme: 'system' | 'light' | 'dark') => set({ colorScheme: scheme }),
      setSelectedColor: (color: 'ExLink' | 'Emerald' | 'Violet' | 'Blue' | 'Amber' | 'Rose' | 'Random') => 
        set({ selectedColor: color }),

      reset: () => set(initialSettings),
    }),
    {
      name: 'exlink-settings',
      storage: createJSONStorage(() => AsyncStorage),
      // Only persist these fields
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

// Selectors for easy access
export const selectDeviceName = (state: AppSettingsStore) => state.deviceName;
export const selectDeviceId = (state: AppSettingsStore) => state.deviceId;
export const selectServerRunning = (state: AppSettingsStore) => state.serverRunning;
export const selectSaveToFolderPath = (state: AppSettingsStore) => state.saveToFolderPath;
export const selectSaveMediaToGallery = (state: AppSettingsStore) => state.saveMediaToGallery;
export const selectTransferHistory = (state: AppSettingsStore) => state.transferHistory;
export const selectColorScheme = (state: AppSettingsStore) => state.colorScheme;
export const selectSelectedColor = (state: AppSettingsStore) => state.selectedColor;
