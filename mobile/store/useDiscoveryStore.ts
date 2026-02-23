// Import 'create' from zustand for creating a global state store
import { create } from 'zustand';

// Define the structure for a device discovered on the network
export interface NearbyDevice {
  id: string; // Unique identifier for the device (often IP or custom ID)
  name: string; // Display name of the device
  ip: string; // IPv4 address of the device on the local network
  port: number; // Port on which the file transfer server is listening
  platform: 'desktop' | 'mobile'; // Identifier for the device's platform
  os?: string; // Optional operating system details
  brand?: string; // Optional brand/model identifier for UI display
}

// Define the shape of the DiscoveryStore state and actions
interface DiscoveryStore {
  nearbyDevices: NearbyDevice[]; // List of currently discovered devices
  isScanning: boolean; // Flag to indicate if a network scan is actively running
  scanTrigger: number; // A numeric counter used to trigger re-scans in UI components
  triggerScan: () => void; // Action to increment scanTrigger, prompting a scan
  setNearbyDevices: (devices: NearbyDevice[]) => void; // Action to overwrite entire nearby devices list
  updateDevice: (device: NearbyDevice) => void; // Action to add a new device or update an existing one
  setIsScanning: (scanning: boolean) => void; // Action to manually toggle scanning state flag
  clearDevices: () => void; // Action to empty the discovered devices list
}

// Create the zustand store, typed with DiscoveryStore interface
export const useDiscoveryStore = create<DiscoveryStore>((set) => ({
  nearbyDevices: [], // Start with an empty list of devices
  isScanning: false, // Start scanning as false by default
  scanTrigger: 0, // Start scanTrigger at 0
  
  // Increments scanTrigger to force deeply nested components to reactivity refresh scanning
  triggerScan: () => set((state) => ({ scanTrigger: state.scanTrigger + 1 })),
  
  // Directly replaces the nearbyDevices array with a new array
  setNearbyDevices: (devices) => set({ nearbyDevices: devices }),
  
  // Smart update function: merges updates if device exists, otherwise appends new device
  updateDevice: (device) =>
    set((state) => {
      // Check if the device is already in the list by looking up its ID
      const exists = state.nearbyDevices.find((d) => d.id === device.id);
      
      if (exists) {
        // If it exists, map over devices and merge new properties into the existing device
        return {
          nearbyDevices: state.nearbyDevices.map((d) =>
            d.id === device.id ? { ...d, ...device } : d
          ),
        };
      }
      
      // If it doesn't exist, append the new device to the current list
      return { nearbyDevices: [...state.nearbyDevices, device] };
    }),
    
  // Updates the boolean flag indicating if scanning is active
  setIsScanning: (scanning) => set({ isScanning: scanning }),
  
  // Empties the nearby device list when leaving the screen or resetting
  clearDevices: () => set({ nearbyDevices: [] }),
}));
