"use client";

import { createContext, useContext, useEffect, useState } from "react";
import {
  BUILT_IN_THEME_PRESETS,
  DEFAULT_APPEARANCE_SETTINGS,
  THEME_STORAGE_KEY,
  findThemePreset,
  sanitizeAppearanceSettings,
  type AppearanceSettings,
  type ThemePreset,
} from "../lib/userSettings";

interface ThemeContextType {
  theme: "light" | "dark";
  selectedThemeId: string;
  customThemes: ThemePreset[];
  availableThemes: ThemePreset[];
  toggleTheme: () => void;
  applyAppearanceSettings: (settings: AppearanceSettings) => void;
  setSelectedThemeId: (themeId: string) => void;
  setCustomThemes: (themes: ThemePreset[]) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

function applyTheme(themeId: string, customThemes: ThemePreset[]) {
  const preset = findThemePreset(themeId, customThemes);
  document.documentElement.setAttribute("data-theme", preset.mode);
  document.documentElement.setAttribute("data-theme-id", preset.id);
  document.documentElement.style.setProperty("--bg-color", preset.colors.bgColor);
  document.documentElement.style.setProperty("--text-color", preset.colors.textColor);
  document.documentElement.style.setProperty("--primary-color", preset.colors.primaryColor);
  document.documentElement.style.setProperty("--accent-color", preset.colors.accentColor);
  document.documentElement.style.setProperty("--highlight-color", preset.colors.highlightColor);
  document.documentElement.style.setProperty("--card-color", preset.colors.cardColor);
  document.documentElement.style.setProperty("--navbar-color", preset.colors.navbarColor);
  document.documentElement.style.setProperty("--navbar-border-gradient", preset.colors.navbarBorderGradient);
  document.documentElement.style.setProperty("--navbar-text-color", preset.colors.navbarTextColor);
  document.documentElement.style.setProperty("--bg-gradient", preset.colors.bgGradient);
  document.documentElement.style.setProperty("--button-gradient-start", preset.colors.buttonGradientStart);
  document.documentElement.style.setProperty("--button-gradient-end", preset.colors.buttonGradientEnd);
  document.documentElement.style.setProperty("--foreground-rgb", preset.colors.foregroundRgb);
  document.documentElement.style.setProperty("--background-start-rgb", preset.colors.backgroundStartRgb);
  document.documentElement.style.setProperty("--background-end-rgb", preset.colors.backgroundEndRgb);
  return preset;
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const [selectedThemeId, setSelectedThemeIdState] = useState(DEFAULT_APPEARANCE_SETTINGS.selectedThemeId);
  const [customThemes, setCustomThemesState] = useState<ThemePreset[]>(DEFAULT_APPEARANCE_SETTINGS.customThemes);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem(THEME_STORAGE_KEY);
    const legacyTheme = localStorage.getItem("theme");
    const fallbackThemeId = legacyTheme === "dark" ? "dark" : "light";
    const nextSettings = stored
      ? sanitizeAppearanceSettings(JSON.parse(stored))
      : { ...DEFAULT_APPEARANCE_SETTINGS, selectedThemeId: fallbackThemeId };
    const preset = applyTheme(nextSettings.selectedThemeId, nextSettings.customThemes);
    setSelectedThemeIdState(preset.id);
    setCustomThemesState(nextSettings.customThemes);
    setTheme(preset.mode);
    setMounted(true);
  }, []);

  useEffect(() => {
    if (mounted) {
      const preset = applyTheme(selectedThemeId, customThemes);
      setTheme(preset.mode);
      localStorage.setItem(THEME_STORAGE_KEY, JSON.stringify({
        selectedThemeId: preset.id,
        customThemes,
      } satisfies AppearanceSettings));
      localStorage.setItem("theme", preset.mode);
    }
  }, [selectedThemeId, customThemes, mounted]);

  function toggleTheme() {
    setSelectedThemeIdState((prev) => (findThemePreset(prev, customThemes).mode === "dark" ? "light" : "dark"));
  }

  function applyAppearanceSettings(settings: AppearanceSettings) {
    const nextSettings = sanitizeAppearanceSettings(settings);
    setSelectedThemeIdState(nextSettings.selectedThemeId);
    setCustomThemesState(nextSettings.customThemes);
  }

  function setSelectedThemeId(themeId: string) {
    setSelectedThemeIdState(findThemePreset(themeId, customThemes).id);
  }

  function setCustomThemes(themes: ThemePreset[]) {
    const nextSettings = sanitizeAppearanceSettings({
      selectedThemeId,
      customThemes: themes,
    });
    setCustomThemesState(nextSettings.customThemes);
    setSelectedThemeIdState(nextSettings.selectedThemeId);
  }

  return (
    <ThemeContext.Provider
      value={{
        theme,
        selectedThemeId,
        customThemes,
        availableThemes: [...BUILT_IN_THEME_PRESETS, ...customThemes],
        toggleTheme,
        applyAppearanceSettings,
        setSelectedThemeId,
        setCustomThemes,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used within ThemeProvider");
  return ctx;
}
