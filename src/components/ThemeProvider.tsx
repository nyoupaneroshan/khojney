'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

// Define the shape of our theme context
interface ThemeContextType {
  theme: 'light' | 'dark'; // This will represent the currently active theme
  toggleTheme: () => void;
}

// Create the context
const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

// Custom hook to use the theme context
export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

// Theme Provider component
interface ThemeProviderProps {
  children: ReactNode;
}

export const ThemeProvider = ({ children }: ThemeProviderProps) => {
  // Use `null` as the initial state for the theme.
  // This ensures that during the initial server render and first client render,
  // we don't prematurely try to set a theme based on localStorage,
  // matching the server's HTML output (which has no theme class).
  const [theme, setTheme] = useState<'light' | 'dark' | null>(null);

  // Effect to load theme from localStorage and apply to <html> on mount
  useEffect(() => {
    const root = document.documentElement;
    const savedTheme = localStorage.getItem('theme');
    // Determine the initial theme from localStorage, default to 'dark'
    const initialTheme = savedTheme === 'light' ? 'light' : 'dark';

    // Apply the class to the <html> element immediately after getting it from localStorage
    // This happens only on the client after hydration.
    if (initialTheme === 'dark') {
      root.classList.add('dark');
      root.classList.remove('light');
    } else {
      root.classList.add('light');
      root.classList.remove('dark');
    }

    // Set the React state to reflect the actual theme loaded from localStorage
    // This will trigger the second useEffect for subsequent changes.
    setTheme(initialTheme);
  }, []); // Empty dependency array ensures this effect runs only once after mount

  // Effect to update the class on <html> and localStorage when the `theme` state changes
  // (e.g., when `toggleTheme` is called)
  useEffect(() => {
    // Only run this effect if the theme has been initialized (i.e., not `null`)
    if (theme === null) return;

    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
      root.classList.remove('light');
    } else {
      root.classList.add('light');
      root.classList.remove('dark');
    }
    // Save the new theme preference to localStorage
    localStorage.setItem('theme', theme);
  }, [theme]); // Rerun this effect whenever the `theme` state changes

  // Function to toggle the theme
  const toggleTheme = () => {
    setTheme((prevTheme) => (prevTheme === 'light' ? 'dark' : 'light'));
  };

  // Provide the theme and toggle function.
  // We'll provide 'dark' as a fallback if `theme` is still null (very briefly during initial render)
  // to ensure consumers always get a valid theme string.
  const currentThemeForContext = theme || 'dark'; // Fallback to 'dark' until initialized

  return (
    <ThemeContext.Provider value={{ theme: currentThemeForContext, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};