import { assertEquals } from "@std/assert";

import { address } from "../../core/types/address.ts";
import { SUPERCHIP_PROFILE } from "./superchip-profile.ts";
import { SUPERCHIP_LARGE_FONT_IMAGE } from "../../font/superchip-large-font-image.ts";

Deno.test("SUPER-CHIP profile defines its display and compatibility semantics", () => {
  assertEquals(SUPERCHIP_PROFILE.display.specification, {
    kind: "superchip",
    backingWidth: 128,
    backingHeight: 64,
    initialMode: "low",
  });

  assertEquals(SUPERCHIP_PROFILE.compatibility.shiftSource, "vx");

  assertEquals(SUPERCHIP_PROFILE.compatibility.memoryTransferIndex, "unchanged");

  assertEquals(SUPERCHIP_PROFILE.compatibility.jumpOffsetSource, "vx");

  assertEquals(SUPERCHIP_PROFILE.compatibility.logicFlag, "unchanged");

  assertEquals(SUPERCHIP_PROFILE.compatibility.spriteOverflow, "clip");

  assertEquals(SUPERCHIP_PROFILE.compatibility.spriteDrawTiming, {
    kind: "display-mode",
    low: "vertical-blank",
    high: "immediate",
  });

  // assertEquals(SUPERCHIP_PROFILE.compatibility.interpreterExit, "exit");
  assertEquals(SUPERCHIP_PROFILE.compatibility.indexOverflow, "exit-interpreter");

  assertEquals(SUPERCHIP_PROFILE.largeFont?.baseAddress, address(0x0a0));

  assertEquals(SUPERCHIP_PROFILE.largeFont?.image, SUPERCHIP_LARGE_FONT_IMAGE);
});

Deno.test("SUPER-CHIP uses the SUPER-CHIP 1.1 instruction set", () => {
  assertEquals(SUPERCHIP_PROFILE.instructionSet, {
    kind: "superchip-1.1",
  });
});
