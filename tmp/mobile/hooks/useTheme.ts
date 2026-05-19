// Import the primary theme hook from the ThemeContext file
// This hook provides access to the current theme colors and functions
import { useAppTheme } from '../context/ThemeContext';

// Re-export the useAppTheme hook as useTheme for simpler imports across the app
// This allows components to use `import { useTheme } from '@/hooks/useTheme'`
export { useAppTheme as useTheme };

// Re-export the ColorTheme type so other files can use it for type annotations
// This ensures consistency when working with theme colors in different components
export type { ColorTheme } from '../context/ThemeContext';
