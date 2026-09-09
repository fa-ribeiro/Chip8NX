export type WebTheme = "dark-theme" | "retro-green" | "retro-amber";

export const DEFAULT_WEB_THEME: WebTheme = "retro-green";

const WEB_THEME_STORAGE_KEY = "chip8nx.web.theme";

/**
 * Minimal storage capability required by Web theme persistence.
 *
 * Window.localStorage satisfies this contract, while tests can provide a
 * lightweight substitute without implementing the full Storage interface.
 */
export interface WebThemeStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

export function parseWebTheme(value: string | null): WebTheme | undefined {
  switch (value) {
    case "retro-green":
    case "retro-amber":
    case "dark-theme":
      return value;

    default:
      return undefined;
  }
}

export function loadWebTheme(storage: WebThemeStorage): WebTheme {
  try {
    return parseWebTheme(storage.getItem(WEB_THEME_STORAGE_KEY)) ?? DEFAULT_WEB_THEME;
  } catch {
    /*
     * Theme persistence is a presentation convenience. Storage failure
     * must never prevent the emulator from starting.
     */
    return DEFAULT_WEB_THEME;
  }
}

export function storeWebTheme(storage: WebThemeStorage, theme: WebTheme): void {
  try {
    storage.setItem(WEB_THEME_STORAGE_KEY, theme);
  } catch {
    /*
     * A theme change remains valid for the current page even when the
     * browser refuses persistent storage.
     */
  }
}
