import { assertEquals } from "@std/assert";

import { address } from "../core/types/address.ts";
import { byte } from "../core/types/byte.ts";
import { SuperChipFont } from "./superchip-font.ts";

const SMALL_FONT_BASE_ADDRESS = address(0x050);
const LARGE_FONT_BASE_ADDRESS = address(0x0a0);

Deno.test("SuperChipFont resolves small glyphs using classic font semantics", () => {
  const font = new SuperChipFont(SMALL_FONT_BASE_ADDRESS, LARGE_FONT_BASE_ADDRESS);

  assertEquals(font.getSpriteAddress(byte(0x03), "small"), address(0x05f));
});

Deno.test("SuperChipFont small font uses the low nibble", () => {
  const font = new SuperChipFont(SMALL_FONT_BASE_ADDRESS, LARGE_FONT_BASE_ADDRESS);

  assertEquals(font.getSpriteAddress(byte(0xab), "small"), address(0x087));
});

Deno.test("SuperChipFont resolves ten-byte large glyphs", () => {
  const font = new SuperChipFont(SMALL_FONT_BASE_ADDRESS, LARGE_FONT_BASE_ADDRESS);

  assertEquals(font.getSpriteAddress(byte(0x03), "large"), address(0x0be));

  assertEquals(font.getSpriteAddress(byte(0x09), "large"), address(0x0fa));
});

Deno.test("SuperChipFont large font does not mask values above 9", () => {
  const font = new SuperChipFont(SMALL_FONT_BASE_ADDRESS, LARGE_FONT_BASE_ADDRESS);

  assertEquals(font.getSpriteAddress(byte(0x0a), "large"), address(0x104));
});
