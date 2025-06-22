'use client'; // This component will use client-side features

import { useTheme } from './ThemeProvider'; // Import our custom hook
import { Sun, Moon } from 'lucide-react'; // Assuming you have lucide-react installed

export const ThemeToggle = () => {
  const { theme, toggleTheme } = useTheme();

  return (
    <button
      onClick={toggleTheme}
      className="p-2 rounded-full bg-gray-700 dark:bg-gray-800 text-gray-200 dark:text-yellow-400 hover:bg-gray-600 dark:hover:bg-gray-700 transition-colors duration-200"
      aria-label="Toggle theme"
    >
      {theme === 'dark' ? (
        <Sun size={20} /> // Sun icon for light theme
      ) : (
        <Moon size={20} /> // Moon icon for dark theme
      )}
    </button>
  );
};