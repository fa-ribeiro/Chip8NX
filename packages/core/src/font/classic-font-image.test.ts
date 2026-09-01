import { assertEquals } from "@std/assert";

import { byte } from "../core/types/byte.ts";
import { CLASSIC_FONT_GLYPH_COUNT, CLASSIC_FONT_GLYPH_SIZE } from "./classic-font.ts";
import { CLASSIC_FONT_IMAGE } from "./classic-font-image.ts";

Deno.test("Classic font image contains sixteen five-byte glyphs", () => {
  assertEquals(
    CLASSIC_FONT_IMAGE.bytes.length,
    CLASSIC_FONT_GLYPH_COUNT * CLASSIC_FONT_GLYPH_SIZE,
  );
});

Deno.test("Classic font image contains the original glyph for 1", () => {
  const start = 0x1 * CLASSIC_FONT_GLYPH_SIZE;

  assertEquals(CLASSIC_FONT_IMAGE.bytes.slice(start, start + CLASSIC_FONT_GLYPH_SIZE), [
    byte(0x60),
    byte(0x20),
    byte(0x20),
    byte(0x20),
    byte(0x70),
  ]);
});

Deno.test("Classic font image contains the original glyph for B", () => {
  const start = 0xb * CLASSIC_FONT_GLYPH_SIZE;

  assertEquals(CLASSIC_FONT_IMAGE.bytes.slice(start, start + CLASSIC_FONT_GLYPH_SIZE), [
    byte(0xf0),
    byte(0x50),
    byte(0x70),
    byte(0x50),
    byte(0xf0),
  ]);
});
