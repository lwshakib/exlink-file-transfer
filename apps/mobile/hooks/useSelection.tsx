// Import necessary React hooks for context creation, usage, state management, and typing
import React, { createContext, useContext, useState, ReactNode } from 'react';

// Define the structure of a selected item (file, folder, app, media, text)
export interface SelectedItem {
  id: string; // Unique identifier for the item
  name: string; // Display name of the item
  size: number; // Size of the item in bytes
  type: 'file' | 'media' | 'text' | 'folder' | 'app'; // Type categorizing the item
  uri?: string; // Optional URI pointing to the item's location (mainly for media/files)
  content?: string; // Optional content (mainly for text type)
  mimeType?: string; // Optional MIME type for better handling during transfer
}

// Define the shape of the context object that will be provided to consumers
interface SelectionContextType {
  selectedItems: SelectedItem[]; // Array of currently selected items
  addItem: (item: SelectedItem) => void; // Function to add a single item
  addItems: (items: SelectedItem[]) => void; // Function to add multiple items at once
  removeItem: (id: string) => void; // Function to remove an item by its ID
  clearSelection: () => void; // Function to clear all selections
  totalSize: number; // Computed total size of all selected items
  hasSelection: boolean; // Boolean flag indicating if there is at least one item selected
}

// Create the context with undefined as default, to be populated by the provider
const SelectionContext = createContext<SelectionContextType | undefined>(undefined);

// Provider component that wraps parts of the app that need access to selection state
export function SelectionProvider({ children }: { children: ReactNode }) {
  // State to hold the array of selected items
  const [selectedItems, setSelectedItems] = useState<SelectedItem[]>([]);

  // Function to add a single item to the selection
  const addItem = (item: SelectedItem) => {
    // Uses functional state update to append the new item to the previous state
    setSelectedItems((prev) => [...prev, item]);
  };

  // Function to add multiple items, useful for selecting a folder's contents or batch selecting
  const addItems = (items: SelectedItem[]) => {
    // Appends all new items to the existing selection
    setSelectedItems((prev) => [...prev, ...items]);
  };

  // Function to remove a specific item based on its ID
  const removeItem = (id: string) => {
    // Filters out the item that matches the provided ID
    setSelectedItems((prev) => prev.filter((item) => item.id !== id));
  };

  // Function to empty the selection array completely
  const clearSelection = () => {
    // Resets state to an empty array
    setSelectedItems([]);
  };

  // Calculate the total size of selected items by summing up the size property of each item
  const totalSize = selectedItems.reduce((acc, item) => acc + item.size, 0);

  // Return the provider component, passing the state and functions to as the value
  return (
    <SelectionContext.Provider
      value={{
        selectedItems, // Expose current selection
        addItem, // Expose function to add item
        addItems, // Expose function to add multiple items
        removeItem, // Expose function to remove item
        clearSelection, // Expose function to clear selection
        totalSize, // Expose computed total size
        hasSelection: selectedItems.length > 0, // Expose boolean representing if any item is selected
      }}
    >
      {/* Render children which can now access this context */}
      {children}
    </SelectionContext.Provider>
  );
}

// Custom hook to consume the SelectionContext easily in components
export function useSelection() {
  const context = useContext(SelectionContext);
  // Throw an error if the hook is used outside of a SelectionProvider wrapper
  if (context === undefined) {
    throw new Error('useSelection must be used within a SelectionProvider');
  }
  // Return the context value containing state and functions
  return context;
}
