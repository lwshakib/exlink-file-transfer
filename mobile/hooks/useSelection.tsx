import React, { createContext, useContext, useState, ReactNode } from 'react';

export interface SelectedItem {
  id: string;
  name: string;
  size: number;
  type: 'file' | 'media' | 'text' | 'folder' | 'app';
  uri?: string;
  content?: string;
  mimeType?: string;
}

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

export function SelectionProvider({ children }: { children: ReactNode }) {
  const [selectedItems, setSelectedItems] = useState<SelectedItem[]>([]);

  const addItem = (item: SelectedItem) => {
    setSelectedItems((prev) => [...prev, item]);
  };

  const addItems = (items: SelectedItem[]) => {
    setSelectedItems((prev) => [...prev, ...items]);
  };

  const removeItem = (id: string) => {
    setSelectedItems((prev) => prev.filter((item) => item.id !== id));
  };

  const clearSelection = () => {
    setSelectedItems([]);
  };

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
