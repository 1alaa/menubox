import React, { useEffect } from "react";
import { RestaurantTheme } from "../types";

interface ThemeHandlerProps {
  theme?: RestaurantTheme;
}

export const ThemeHandler: React.FC<ThemeHandlerProps> = ({ theme }) => {
  useEffect(() => {
    if (!theme) return;

    const root = document.documentElement;
    root.style.setProperty("--color-primary", theme.primary);
    root.style.setProperty("--color-secondary", theme.secondary);
    root.style.setProperty("--color-background", theme.background);
    
    if (theme.mode === "dark") {
      root.classList.add("dark");
      root.style.setProperty("--color-text", "#ffffff");
      root.style.setProperty("--color-surface", "#1a1a1a");
    } else {
      root.classList.remove("dark");
      root.style.setProperty("--color-text", "#1a1a1a");
      root.style.setProperty("--color-surface", "#ffffff");
    }

    return () => {
      // Reset on unmount
      root.style.removeProperty("--color-primary");
      root.style.removeProperty("--color-secondary");
      root.style.removeProperty("--color-background");
      root.style.removeProperty("--color-text");
      root.style.removeProperty("--color-surface");
      root.classList.remove("dark");
    };
  }, [theme]);

  return null;
};
