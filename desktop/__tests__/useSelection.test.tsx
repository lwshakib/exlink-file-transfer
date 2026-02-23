import { renderHook, act } from '@testing-library/react';
import { SelectionProvider, useSelection } from '../src/hooks/useSelection';
import { describe, it, expect } from 'vitest';
import React, { ReactNode } from 'react';

describe('useSelection hook', () => {
  // Test Wrapper: Injects the SelectionProvider to provide context for the hook
  const wrapper = ({ children }: { children: ReactNode }) => (
    <SelectionProvider>{children}</SelectionProvider>
  );

  // Test Case: Ensures initial state is clean and values are zeroed
  it('should start with an empty selection', () => {
    const { result } = renderHook(() => useSelection(), { wrapper });
    expect(result.current.selectedItems).toEqual([]);
    expect(result.current.totalSize).toBe(0);
    expect(result.current.hasSelection).toBe(false);
  });

  // Test Case: Validates append logic and cumulative size updates
  it('should add an item', () => {
    const { result } = renderHook(() => useSelection(), { wrapper });
    const item = { id: '1', name: 'test.txt', size: 100, type: 'file' as const };

    act(() => {
      result.current.addItem(item);
    });

    expect(result.current.selectedItems).toContainEqual(item);
    expect(result.current.totalSize).toBe(100);
    expect(result.current.hasSelection).toBe(true);
  });

  // Test Case: Verifies removal logic by filtering out specific IDs
  it('should remove an item', () => {
    const { result } = renderHook(() => useSelection(), { wrapper });
    const item = { id: '1', name: 'test.txt', size: 100, type: 'file' as const };

    act(() => {
      result.current.addItem(item);
    });
    expect(result.current.selectedItems.length).toBe(1);

    act(() => {
      result.current.removeItem('1');
    });

    expect(result.current.selectedItems).toEqual([]);
    expect(result.current.totalSize).toBe(0);
  });

  // Test Case: Validates bulk clear functionality
  it('should clear selection', () => {
    const { result } = renderHook(() => useSelection(), { wrapper });
    act(() => {
      result.current.addItems([
        { id: '1', name: 't1', size: 10, type: 'file' },
        { id: '2', name: 't2', size: 20, type: 'file' },
      ]);
    });

    expect(result.current.selectedItems.length).toBe(2);

    act(() => {
      result.current.clearSelection();
    });

    expect(result.current.selectedItems).toEqual([]);
  });
});
