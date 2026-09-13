import { assertEquals } from "@std/assert";

import { byte } from "../core/types/byte.ts";
import {
  SUPERCHIP_LARGE_FONT_GLYPH_COUNT,
  SUPERCHIP_LARGE_FONT_GLYPH_SIZE,
  SUPERCHIP_LARGE_FONT_IMAGE,
} from "./superchip-large-font-image.ts";

Deno.test("SUPER-CHIP large font image contains ten ten-byte glyphs", () => {
  assertEquals(
    SUPERCHIP_LARGE_FONT_IMAGE.bytes.length,
    SUPERCHIP_LARGE_FONT_GLYPH_COUNT * SUPERCHIP_LARGE_FONT_GLYPH_SIZE,
  );
});

Deno.test("SUPER-CHIP large font image contains the v1.1 glyph for 0", () => {
  const start = 0 * SUPERCHIP_LARGE_FONT_GLYPH_SIZE;

  assertEquals(
    SUPERCHIP_LARGE_FONT_IMAGE.bytes.slice(start, start + SUPERCHIP_LARGE_FONT_GLYPH_SIZE),
    [
      byte(0x3c),
      byte(0x7e),
      byte(0xe7),
      byte(0xc3),
      byte(0xc3),
      byte(0xc3),
      byte(0xc3),
      byte(0xe7),
      byte(0x7e),
      byte(0x3c),
    ],
  );
});

Deno.test("SUPER-CHIP large font image contains the v1.1 glyph for 6", () => {
  const start = 6 * SUPERCHIP_LARGE_FONT_GLYPH_SIZE;

  assertEquals(
    SUPERCHIP_LARGE_FONT_IMAGE.bytes.slice(start, start + SUPERCHIP_LARGE_FONT_GLYPH_SIZE),
    [
      byte(0x3e),
      byte(0x7c),
      byte(0xe0),
      byte(0xc0),
      byte(0xfc),
      byte(0xfe),
      byte(0xc3),
      byte(0xc3),
      byte(0x7e),
      byte(0x3c),
    ],
  );
});
