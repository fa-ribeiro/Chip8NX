import { assertEquals } from "@std/assert";

import { address } from "../core/types/address.ts";
import { byte } from "../core/types/byte.ts";
import { ClassicFont } from "./classic-font.ts";

Deno.test("ClassicFont resolves glyph addresses from a configurable base address", () => {
  const font = new ClassicFont(address(0x100));

  assertEquals(font.getSpriteAddress(byte(0x03)), address(0x10f));
});

Deno.test("ClassicFont resolves hexadecimal glyphs above 9", () => {
  const font = new ClassicFont();

  assertEquals(font.getSpriteAddress(byte(0x0a)), address(0x82));
});

Deno.test("ClassicFont selects the glyph from the low nibble", () => {
  const font = new ClassicFont();

  assertEquals(font.getSpriteAddress(byte(0xab)), address(0x87));
});
