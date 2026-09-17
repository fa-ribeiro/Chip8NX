import { assertEquals } from "@std/assert";

import { Frequency } from "../../core/types/frequency.ts";
import { SUPERCHIP_PROFILE } from "../superchip/superchip-profile.ts";
import { SUPERCHIP_MODERN_PROFILE } from "./superchip-modern-profile.ts";

Deno.test(
  "Modern SUPER-CHIP profile defines its machine characteristics and shared-instruction quirks",
  () => {
    assertEquals(SUPERCHIP_MODERN_PROFILE.memorySize, SUPERCHIP_PROFILE.memorySize);

    assertEquals(
      SUPERCHIP_MODERN_PROFILE.programStartAddress,
      SUPERCHIP_PROFILE.programStartAddress,
    );

    assertEquals(SUPERCHIP_MODERN_PROFILE.stackCapacity, SUPERCHIP_PROFILE.stackCapacity);

    assertEquals(
      SUPERCHIP_MODERN_PROFILE.display.specification,
      SUPERCHIP_PROFILE.display.specification,
    );

    assertEquals(SUPERCHIP_MODERN_PROFILE.display.refreshFrequency, Frequency.fromInteger(60n));

    assertEquals(SUPERCHIP_MODERN_PROFILE.timerFrequency, Frequency.fromInteger(60n));

    assertEquals(SUPERCHIP_MODERN_PROFILE.fonts.small, SUPERCHIP_PROFILE.fonts.small);

    assertEquals(SUPERCHIP_MODERN_PROFILE.fonts.large, SUPERCHIP_PROFILE.fonts.large);

    assertEquals(SUPERCHIP_MODERN_PROFILE.quirks, {
      shiftSource: "vx",
      memoryTransferIndex: "unchanged",
      jumpOffsetSource: "vx",
      logicFlag: "unchanged",
      spriteOverflow: "clip",
      spriteDrawTiming: {
        kind: "uniform",
        timing: "immediate",
      },
      indexOverflow: "continue",
    });
  },
);

Deno.test("Modern SUPER-CHIP uses the Modern SUPER-CHIP instruction set", () => {
  assertEquals(SUPERCHIP_MODERN_PROFILE.instructionSet, {
    kind: "superchip-modern",
  });
});
