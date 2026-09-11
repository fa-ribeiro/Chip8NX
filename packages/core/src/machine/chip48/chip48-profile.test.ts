import { assertEquals } from "@std/assert";

import { address } from "../../core/types/address.ts";
import { Frequency } from "../../core/types/frequency.ts";
import { CHIP48_FONT_IMAGE } from "../../font/chip48-font-image.ts";
import { CHIP48_PROFILE } from "./chip48-profile.ts";

Deno.test("CHIP-48 profile defines the CHIP-48 2.25 machine characteristics", () => {
  assertEquals(CHIP48_PROFILE.memorySize, 0x1000);

  assertEquals(CHIP48_PROFILE.programStartAddress, address(0x200));

  assertEquals(CHIP48_PROFILE.stackCapacity, 16);

  assertEquals(CHIP48_PROFILE.display, {
    width: 64,
    height: 32,
    refreshFrequency: Frequency.fromInteger(64n),
  });

  assertEquals(CHIP48_PROFILE.timerFrequency, Frequency.fromInteger(64n));

  assertEquals(CHIP48_PROFILE.fontImage, CHIP48_FONT_IMAGE);

  assertEquals(CHIP48_PROFILE.fontBaseAddress, address(0x000));

  assertEquals(CHIP48_PROFILE.compatibility, {
    shiftSource: "vx",
    memoryTransferIndex: "increment-by-x",
    jumpOffsetSource: "vx",
    logicFlag: "unchanged",
    spriteOverflow: "clip",
    spriteDrawTiming: "vertical-blank",
  });
});
