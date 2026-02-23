import React from 'react';
import renderer from 'react-test-renderer';
import SelectionDetailsPortal from '../components/SelectionDetailsPortal';

// Mock dependencies
jest.mock('@/hooks/useSelection', () => ({
  useSelection: () => ({
    selectedItems: [
      { id: '1', name: 'Test File.pdf', size: 1024, type: 'file', uri: 'file://1' },
      { id: '2', name: 'Photo.jpg', size: 2048, type: 'media', uri: 'file://2' },
    ],
    removeItem: jest.fn(),
    clearSelection: jest.fn(),
    totalSize: 3072,
  }),
}));

jest.mock('react-native-safe-area-context', () => ({
  SafeAreaProvider: ({ children }: any) => <>{children}</>,
  SafeAreaView: ({ children }: any) => <>{children}</>,
  initialWindowMetrics: {
    frame: { x: 0, y: 0, width: 0, height: 0 },
    insets: { top: 0, left: 0, right: 0, bottom: 0 },
  },
}));

jest.mock('@expo/vector-icons', () => ({
  MaterialCommunityIcons: 'Icon',
}));

jest.mock('react-native-paper', () => {
  const React = require('react');
  return {
    Text: ({ children, variant, style }: any) => <div className={variant} style={style}>{children}</div>,
    IconButton: (props: any) => <button {...props} />,
    Button: (props: any) => <button {...props}>{props.children}</button>,
    Card: ({ children, style }: any) => <div style={style}>{children}</div>,
    Portal: ({ children }: any) => <div className="portal">{children}</div>,
    Modal: ({ children, visible }: any) => visible ? <div className="modal">{children}</div> : null,
    useTheme: () => ({
      colors: {
        background: '#fff',
        onSurface: '#000',
        surfaceVariant: '#ccc',
        onSurfaceVariant: '#333',
        primary: '#6200ee',
      },
    }),
  };
});

describe('SelectionDetailsPortal', () => {
  it('renders correctly with items', () => {
    // Stop timers for snapshot consistency
    jest.useFakeTimers();

    let tree;
    renderer.act(() => {
      tree = renderer.create(
        <SelectionDetailsPortal visible={true} onDismiss={jest.fn()} />
      ).toJSON();
    });

    expect(tree).toMatchSnapshot();
    
    // Cleanup
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });
});
