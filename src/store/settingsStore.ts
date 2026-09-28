// ---------------------------------------------------------------------------
// settingsStore — user preferences (Zustand, persisted to localStorage)
// ---------------------------------------------------------------------------

import { create } from "zustand";
import { DEFAULT_TITLE_FONT, TEXT_FONTS } from "../types";

export type Theme = "dark" | "light";

/** Canvas colours per theme. */
export const THEME_COLORS: Record<
  Theme,
  { background: string; minorLine: string; majorLine: string }
> = {
  dark: {
    background: "#0f1117",
    minorLine: "rgba(255,255,255,0.06)",
    majorLine: "rgba(255,255,255,0.15)",
  },
  light: {
    background: "#f7f7f9",
    minorLine: "rgba(0,0,0,0.07)",
    majorLine: "rgba(0,0,0,0.16)",
  },
};

interface SettingsValues {
  theme: Theme;
  showNoteIds: boolean;
  showGridLines: boolean;
  /** Title font applied to notes created after this is changed. */
  defaultNoteFont: string;
}

interface SettingsStore extends SettingsValues {
  setTheme: (theme: Theme) => void;
  setShowNoteIds: (show: boolean) => void;
  setShowGridLines: (show: boolean) => void;
  setDefaultNoteFont: (font: string) => void;
}

function noteFont(value: unknown): string {
  return TEXT_FONTS.some((font) => font.value === value)
    ? (value as string)
    : DEFAULT_TITLE_FONT;
}

const STORAGE_KEY = "brainbank-settings";

function loadSettings(): SettingsValues {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        theme: parsed.theme === "light" ? "light" : "dark",
        showNoteIds: parsed.showNoteIds !== false,
        showGridLines: parsed.showGridLines !== false,
        defaultNoteFont: noteFont(parsed.defaultNoteFont),
      };
    }
  } catch {
    // Corrupt or unavailable storage — fall through to defaults.
  }
  return {
    theme: "dark",
    showNoteIds: true,
    showGridLines: true,
    defaultNoteFont: DEFAULT_TITLE_FONT,
  };
}

function persist(settings: SettingsValues) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  } catch {
    // Storage full/unavailable — settings just won't survive a restart.
  }
}

function values(s: SettingsStore): SettingsValues {
  return {
    theme: s.theme,
    showNoteIds: s.showNoteIds,
    showGridLines: s.showGridLines,
    defaultNoteFont: s.defaultNoteFont,
  };
}

export const useSettingsStore = create<SettingsStore>((set, get) => ({
  ...loadSettings(),

  setTheme(theme) {
    set({ theme });
    persist({ ...values(get()), theme });
  },

  setShowNoteIds(showNoteIds) {
    set({ showNoteIds });
    persist({ ...values(get()), showNoteIds });
  },

  setShowGridLines(showGridLines) {
    set({ showGridLines });
    persist({ ...values(get()), showGridLines });
  },

  setDefaultNoteFont(defaultNoteFont) {
    const font = noteFont(defaultNoteFont);
    set({ defaultNoteFont: font });
    persist({ ...values(get()), defaultNoteFont: font });
  },
}));
