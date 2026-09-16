import { assertEquals } from "@std/assert";

import { address } from "../../core/types/address.ts";
import { SUPERCHIP_LARGE_FONT_IMAGE } from "../../font/superchip-large-font-image.ts";
import { CHIP48_PROFILE } from "../chip48/chip48-profile.ts";
import { SUPERCHIP_PROFILE } from "./superchip-profile.ts";

Deno.test("SUPER-CHIP profile defines its display, font, and quirk semantics", () => {
  assertEquals(SUPERCHIP_PROFILE.display.specification, {
    kind: "superchip",
    backingWidth: 128,
    backingHeight: 64,
    initialMode: "low",
  });

  assertEquals(SUPERCHIP_PROFILE.quirks.shiftSource, "vx");

  assertEquals(SUPERCHIP_PROFILE.quirks.memoryTransferIndex, "unchanged");

  assertEquals(SUPERCHIP_PROFILE.quirks.jumpOffsetSource, "vx");

  assertEquals(SUPERCHIP_PROFILE.quirks.logicFlag, "unchanged");

  assertEquals(SUPERCHIP_PROFILE.quirks.spriteOverflow, "clip");

  assertEquals(SUPERCHIP_PROFILE.quirks.spriteDrawTiming, {
    kind: "display-mode",
    low: "vertical-blank",
    high: "immediate",
  });

  assertEquals(SUPERCHIP_PROFILE.quirks.indexOverflow, "exit-interpreter");

  assertEquals(SUPERCHIP_PROFILE.fonts.small.image, CHIP48_PROFILE.fonts.small.image);

  assertEquals(
    SUPERCHIP_PROFILE.fonts.small.baseAddress,
    CHIP48_PROFILE.fonts.small.baseAddress,
  );

  assertEquals(SUPERCHIP_PROFILE.fonts.large?.baseAddress, address(0x0a0));

  assertEquals(SUPERCHIP_PROFILE.fonts.large?.image, SUPERCHIP_LARGE_FONT_IMAGE);
});

Deno.test("SUPER-CHIP uses the SUPER-CHIP 1.1 instruction set", () => {
  assertEquals(SUPERCHIP_PROFILE.instructionSet, {
    kind: "superchip-1.1",
  });
});
