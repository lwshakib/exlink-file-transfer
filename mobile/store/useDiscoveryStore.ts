import { create } from 'zustand';

export interface NearbyDevice {
  id: string;
  name: string;
  ip: string;
  port: number;
  platform: 'desktop' | 'mobile';
  os?: string;
  brand?: string;
}

interface DiscoveryStore {
  nearbyDevices: NearbyDevice[];
  isScanning: boolean;
  scanTrigger: number;
  triggerScan: () => void;
  setNearbyDevices: (devices: NearbyDevice[]) => void;
  updateDevice: (device: NearbyDevice) => void;
  setIsScanning: (scanning: boolean) => void;
  clearDevices: () => void;
}

export const useDiscoveryStore = create<DiscoveryStore>((set) => ({
  nearbyDevices: [],
  isScanning: false,
  scanTrigger: 0,
  triggerScan: () => set((state) => ({ scanTrigger: state.scanTrigger + 1 })),
  setNearbyDevices: (devices) => set({ nearbyDevices: devices }),
  updateDevice: (device) => set((state) => {
    const exists = state.nearbyDevices.find(d => d.id === device.id);
    if (exists) {
      return {
        nearbyDevices: state.nearbyDevices.map(d => d.id === device.id ? { ...d, ...device } : d)
      };
    }
    return { nearbyDevices: [...state.nearbyDevices, device] };
  }),
  setIsScanning: (scanning) => set({ isScanning: scanning }),
  clearDevices: () => set({ nearbyDevices: [] }),
}));
