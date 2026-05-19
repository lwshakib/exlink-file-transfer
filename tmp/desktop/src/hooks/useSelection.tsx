/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useState, ReactNode } from 'react';

export interface SelectedItem {
  id: string;
  name: string;
  size: number;
  type: 'file' | 'media' | 'text' | 'folder' | 'app';
  path?: string;
  content?: string;
}

// SelectionContext defines the shared state for items queued for transfer (files, folders, or text)
interface SelectionContextType {
  selectedItems: SelectedItem[];
  addItem: (item: SelectedItem) => void;
  addItems: (items: SelectedItem[]) => void;
  removeItem: (id: string) => void;
  clearSelection: () => void;
  totalSize: number;
  hasSelection: boolean;
}

const SelectionContext = createContext<SelectionContextType | undefined>(undefined);

// Provider component that wraps the app to enable selection tracking across different pages
export function SelectionProvider({ children }: { children: ReactNode }) {
  const [selectedItems, setSelectedItems] = useState<SelectedItem[]>([]);

  // Individual item append
  const addItem = (item: SelectedItem) => {
    setSelectedItems((prev) => [...prev, item]);
  };

  // Bulk item append
  const addItems = (items: SelectedItem[]) => {
    setSelectedItems((prev) => [...prev, ...items]);
  };

  // Filter-out removal by ID
  const removeItem = (id: string) => {
    setSelectedItems((prev) => prev.filter((item) => item.id !== id));
  };

  const clearSelection = () => {
    setSelectedItems([]);
  };

  // Memoized derived state for cumulative size metrics
  const totalSize = selectedItems.reduce((acc, item) => acc + item.size, 0);

  return (
    <SelectionContext.Provider
      value={{
        selectedItems,
        addItem,
        addItems,
        removeItem,
        clearSelection,
        totalSize,
        hasSelection: selectedItems.length > 0,
      }}
    >
      {children}
    </SelectionContext.Provider>
  );
}

export function useSelection() {
  const context = useContext(SelectionContext);
  if (context === undefined) {
    throw new Error('useSelection must be used within a SelectionProvider');
  }
  return context;
}
