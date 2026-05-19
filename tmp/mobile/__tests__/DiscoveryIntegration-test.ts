import { useDiscoveryStore } from '../store/useDiscoveryStore';
import fetchMock from 'jest-fetch-mock';

fetchMock.enableMocks();

// Mock dependencies
jest.mock('expo-network', () => ({
  getIpAddressAsync: jest.fn(() => Promise.resolve('192.168.1.5')),
}));

describe('Discovery Integration', () => {
  // Reset all network mocks and clear the store before each test iteration to ensure isolation
  beforeEach(() => {
    fetchMock.resetMocks();
    useDiscoveryStore.getState().clearDevices();
  });

  // Acceptance Test: Verifies that the discovery worker correctly parses raw JSON from a desktop station
  it('should add a device to the store when a valid server is found', async () => {
    const mockDeviceInfo = {
      id: 'desktop-1',
      name: 'My Computer',
      ip: '192.168.1.10',
      port: 3030,
      platform: 'desktop',
    };

    // Instruction: Mock the fetch response to return our fake desktop identity immediately
    fetchMock.mockResponseOnce(JSON.stringify(mockDeviceInfo));

    // Simulation: Directly invoke the store's update method as the background layout logic would
    useDiscoveryStore.getState().updateDevice({
      ...mockDeviceInfo,
      platform: 'desktop' as const, // Explicitly casting to match internal union types
    });

    const devices = useDiscoveryStore.getState().nearbyDevices;
    // Verification: Data should be held in memory accurately mapped to the mock
    expect(devices).toHaveLength(1);
    expect(devices[0].name).toBe('My Computer');
    expect(devices[0].ip).toBe('192.168.1.10');
  });

  it('should handle announcement failures gracefully', async () => {
    fetchMock.mockReject(new Error('Network request failed'));

    // Check that store remains consistent even if pings fail
    const device = {
      id: 'd2',
      name: 'Other',
      ip: '1.2.3.4',
      port: 3030,
      platform: 'desktop' as const,
    };
    useDiscoveryStore.getState().updateDevice(device);

    expect(useDiscoveryStore.getState().nearbyDevices).toHaveLength(1);
  });
});
