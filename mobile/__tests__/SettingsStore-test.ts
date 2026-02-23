import { useSettingsStore } from '../store/useSettingsStore';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

describe('useSettingsStore', () => {
  beforeEach(() => {
    useSettingsStore.getState().reset();
  });

  it('should initialize with default settings', () => {
    const state = useSettingsStore.getState();
    expect(state.deviceName).toBe('');
    expect(state.serverRunning).toBe(true);
    expect(state.colorScheme).toBe('system');
  });

  it('should update device name', () => {
    useSettingsStore.getState().setDeviceName('New Phone');
    expect(useSettingsStore.getState().deviceName).toBe('New Phone');
  });

  it('should add history items', () => {
    const item = {
      id: '1',
      name: 'file.txt',
      size: 1024,
      timestamp: Date.now(),
    };
    useSettingsStore.getState().addHistoryItem(item);
    expect(useSettingsStore.getState().transferHistory).toHaveLength(1);
    expect(useSettingsStore.getState().transferHistory[0].name).toBe('file.txt');
  });

  it('should clear history', () => {
    const item = {
      id: '1',
      name: 'file.txt',
      size: 1024,
      timestamp: Date.now(),
    };
    useSettingsStore.getState().addHistoryItem(item);
    useSettingsStore.getState().clearHistory();
    expect(useSettingsStore.getState().transferHistory).toHaveLength(0);
  });
});
