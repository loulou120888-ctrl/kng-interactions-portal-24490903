export interface AccentTheme {
  id: string;
  label: string;
  hue: number;
  chroma: number;
  preview: string;
}

export const ACCENT_THEMES: AccentTheme[] = [
  { id: "purple", label: "Purple",  hue: 305, chroma: 0.18, preview: "oklch(0.72 0.18 305)" },
  { id: "pink",   label: "Pink",    hue: 350, chroma: 0.20, preview: "oklch(0.72 0.20 350)" },
  { id: "blue",   label: "Blue",    hue: 240, chroma: 0.18, preview: "oklch(0.72 0.18 240)" },
  { id: "cyan",   label: "Cyan",    hue: 210, chroma: 0.16, preview: "oklch(0.72 0.16 210)" },
  { id: "green",  label: "Green",   hue: 155, chroma: 0.16, preview: "oklch(0.72 0.16 155)" },
  { id: "orange", label: "Orange",  hue: 60,  chroma: 0.18, preview: "oklch(0.72 0.18 60)"  },
  { id: "red",    label: "Red",     hue: 22,  chroma: 0.20, preview: "oklch(0.68 0.20 22)"  },
];

const STORAGE_KEY = "kng_accent_theme";

export function applyAccentTheme(id: string) {
  const theme = ACCENT_THEMES.find(t => t.id === id) ?? ACCENT_THEMES[0];
  const h = theme.hue;
  const c = theme.chroma;
  const l = id === "red" ? 0.68 : 0.72;
  const root = document.documentElement;

  root.style.setProperty("--primary",                        `oklch(${l} ${c} ${h})`);
  root.style.setProperty("--primary-foreground",             "oklch(0.13 0.005 260)");
  root.style.setProperty("--ring",                           `oklch(${l} ${c} ${h})`);
  root.style.setProperty("--accent",                        `oklch(0.28 0.04 ${h})`);
  root.style.setProperty("--accent-foreground",              "oklch(0.96 0.005 260)");
  root.style.setProperty("--sidebar-primary",               `oklch(${l} ${c} ${h})`);
  root.style.setProperty("--sidebar-primary-foreground",    "oklch(0.13 0.005 260)");
  root.style.setProperty("--sidebar-ring",                  `oklch(${l} ${c} ${h})`);
  root.style.setProperty("--chart-1",                       `oklch(${l} ${c} ${h})`);
  root.style.setProperty("--shadow-glow",                   `0 0 30px -8px oklch(${l} ${c} ${h} / 0.4)`);

  localStorage.setItem(STORAGE_KEY, id);
}

export function loadSavedTheme() {
  const saved = localStorage.getItem(STORAGE_KEY) ?? "purple";
  applyAccentTheme(saved);
}

export function getSavedThemeId(): string {
  return localStorage.getItem(STORAGE_KEY) ?? "purple";
}
