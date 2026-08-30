import { assertEquals } from "@std/assert";

import { address } from "../../src/core/types/address.ts";
import { byte } from "../../src/core/types/byte.ts";
import { Ram } from "../../src/memory/ram.ts";
import { MemoryImageLoader } from "../../src/memory/memory-image-loader.ts";
import { CLASSIC_FONT_GLYPH_SIZE, ClassicFont } from "../../src/font/classic-font.ts";
import { CLASSIC_FONT_IMAGE } from "../../src/font/classic-font-image.ts";

Deno.test("ClassicFont sprite addresses point to the loaded font image", () => {
  const memory = new Ram(0x1000);
  const loader = new MemoryImageLoader();

  const fontBaseAddress = address(0x100);
  const font = new ClassicFont(fontBaseAddress);

  loader.load(memory, fontBaseAddress, CLASSIC_FONT_IMAGE);

  const spriteAddress = font.getSpriteAddress(byte(0x0b));

  assertEquals(spriteAddress, address(fontBaseAddress + 0x0b * CLASSIC_FONT_GLYPH_SIZE));

  assertEquals(
    [
      memory.read(spriteAddress),
      memory.read(address(spriteAddress + 1)),
      memory.read(address(spriteAddress + 2)),
      memory.read(address(spriteAddress + 3)),
      memory.read(address(spriteAddress + 4)),
    ],
    [byte(0xf0), byte(0x50), byte(0x70), byte(0x50), byte(0xf0)],
  );
});
