import { assertEquals } from "@std/assert";

import {
  CHIP48_PROFILE,
  type Chip8InstructionSet,
  type Chip8Profile,
  type Chip8Quirks,
  CLASSIC_CHIP8_PROFILE,
  SUPERCHIP_PROFILE,
} from "../../mod.ts";

Deno.test("Core public API exposes the built-in CHIP-8 profiles", () => {
  const profiles: readonly Chip8Profile[] = [
    CLASSIC_CHIP8_PROFILE,
    CHIP48_PROFILE,
    SUPERCHIP_PROFILE,
  ];

  assertEquals(profiles.length, 3);
});

Deno.test("Core public API exposes instruction-set and quirk profile types", () => {
  const instructionSet: Chip8InstructionSet = CLASSIC_CHIP8_PROFILE.instructionSet;
  const quirks: Chip8Quirks = CLASSIC_CHIP8_PROFILE.quirks;

  assertEquals(instructionSet.kind, "chip8");
  assertEquals(quirks.shiftSource, "vy");
});
