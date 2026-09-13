import { assertEquals, assertThrows } from "@std/assert";

import { address } from "../core/types/address.ts";
import { byte } from "../core/types/byte.ts";
import { ClassicFont } from "./classic-font.ts";

const TEST_FONT_BASE_ADDRESS = address(0x100);

Deno.test("ClassicFont resolves glyph addresses from a configurable base address", () => {
  const font = new ClassicFont(TEST_FONT_BASE_ADDRESS);

  assertEquals(font.getSpriteAddress(byte(0x03), "small"), address(0x10f));
});

Deno.test("ClassicFont resolves hexadecimal glyphs above 9", () => {
  const font = new ClassicFont(TEST_FONT_BASE_ADDRESS);

  assertEquals(font.getSpriteAddress(byte(0x0a), "small"), address(0x132));
});

Deno.test("ClassicFont selects the glyph from the low nibble", () => {
  const font = new ClassicFont(TEST_FONT_BASE_ADDRESS);

  assertEquals(font.getSpriteAddress(byte(0xab), "small"), address(0x137));
});

Deno.test("ClassicFont rejects large font lookup", () => {
  const font = new ClassicFont(TEST_FONT_BASE_ADDRESS);

  assertThrows(
    () => font.getSpriteAddress(byte(0x03), "large"),
    RangeError,
    "Classic CHIP-8 does not provide a large font.",
  );
});
