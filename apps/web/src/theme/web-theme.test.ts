import { assertEquals } from "@std/assert";

import {
  DEFAULT_WEB_THEME,
  loadWebTheme,
  parseWebTheme,
  storeWebTheme,
  type WebThemeStorage,
} from "./web-theme.ts";

function memoryStorage(
  initialValue: string | null = null,
): {
  readonly storage: WebThemeStorage;
  readonly readValue: () => string | null;
} {
  let value = initialValue;

  return {
    storage: {
      getItem: () => value,

      setItem: (_key, nextValue) => {
        value = nextValue;
      },
    },

    readValue: () => value,
  };
}

Deno.test("parses supported Web themes", () => {
  assertEquals(
    parseWebTheme("dark-theme"),
    "dark-theme",
  );

  assertEquals(
    parseWebTheme("retro-green"),
    "retro-green",
  );

  assertEquals(
    parseWebTheme("retro-amber"),
    "retro-amber",
  );

  assertEquals(
    parseWebTheme("unknown"),
    undefined,
  );
});

Deno.test("loads the default theme when no valid preference exists", () => {
  const { storage } = memoryStorage("unknown");

  assertEquals(
    loadWebTheme(storage),
    DEFAULT_WEB_THEME,
  );
});

Deno.test("loads and stores a Web theme preference", () => {
  const { storage, readValue } = memoryStorage(
    "retro-green",
  );

  assertEquals(
    loadWebTheme(storage),
    "retro-green",
  );

  storeWebTheme(
    storage,
    "retro-amber",
  );

  assertEquals(
    readValue(),
    "retro-amber",
  );
});
