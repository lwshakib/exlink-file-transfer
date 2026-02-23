import { useDiscoveryStore } from '../store/useDiscoveryStore';

describe('useDiscoveryStore', () => {
  beforeEach(() => {
    useDiscoveryStore.getState().clearDevices();
    useDiscoveryStore.getState().setIsScanning(false);
  });

  it('should initialize with empty devices', () => {
    const state = useDiscoveryStore.getState();
    expect(state.nearbyDevices).toEqual([]);
    expect(state.isScanning).toBe(false);
  });

  it('should set nearby devices', () => {
    const devices = [
      { id: '1', name: 'Test Device', ip: '192.168.1.1', port: 3030, platform: 'desktop' as const },
    ];
    useDiscoveryStore.getState().setNearbyDevices(devices);
    expect(useDiscoveryStore.getState().nearbyDevices).toEqual(devices);
  });

  it('should update an existing device', () => {
    const initialDevice = {
      id: '1',
      name: 'Initial',
      ip: '1.1.1.1',
      port: 3030,
      platform: 'desktop' as const,
    };
    const updatedDevice = {
      id: '1',
      name: 'Updated',
      ip: '1.1.1.1',
      port: 3030,
      platform: 'desktop' as const,
    };

    useDiscoveryStore.getState().updateDevice(initialDevice);
    useDiscoveryStore.getState().updateDevice(updatedDevice);

    expect(useDiscoveryStore.getState().nearbyDevices).toHaveLength(1);
    expect(useDiscoveryStore.getState().nearbyDevices[0].name).toBe('Updated');
  });

  it('should toggle isScanning', () => {
    useDiscoveryStore.getState().setIsScanning(true);
    expect(useDiscoveryStore.getState().isScanning).toBe(true);
    useDiscoveryStore.getState().setIsScanning(false);
    expect(useDiscoveryStore.getState().isScanning).toBe(false);
  });
});
