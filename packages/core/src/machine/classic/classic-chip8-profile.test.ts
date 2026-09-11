import { assertEquals } from "@std/assert";

import { address } from "../../core/types/address.ts";
import { Frequency } from "../../core/types/frequency.ts";
import { CLASSIC_FONT_IMAGE } from "../../font/classic-font-image.ts";
import { CLASSIC_CHIP8_PROFILE } from "./classic-chip8-profile.ts";

Deno.test("Classic CHIP-8 profile defines the classic machine characteristics", () => {
  assertEquals(CLASSIC_CHIP8_PROFILE.memorySize, 0x1000);

  assertEquals(CLASSIC_CHIP8_PROFILE.programStartAddress, address(0x200));

  assertEquals(CLASSIC_CHIP8_PROFILE.stackCapacity, 16);

  assertEquals(CLASSIC_CHIP8_PROFILE.display, {
    width: 64,
    height: 32,
    refreshFrequency: Frequency.fromInteger(60n),
  });

  assertEquals(CLASSIC_CHIP8_PROFILE.timerFrequency, Frequency.fromInteger(60n));

  assertEquals(CLASSIC_CHIP8_PROFILE.fontImage, CLASSIC_FONT_IMAGE);

  assertEquals(CLASSIC_CHIP8_PROFILE.fontBaseAddress, address(0x50));

  assertEquals(CLASSIC_CHIP8_PROFILE.compatibility, {
    shiftSource: "vy",
    memoryTransferIndex: "increment-by-count",
    jumpOffsetSource: "v0",
    logicFlag: "reset",
    spriteOverflow: "clip",
    spriteDrawTiming: "vertical-blank",
  });
});
