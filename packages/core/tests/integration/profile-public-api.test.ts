import { assertEquals } from "@std/assert";

import {
  CHIP48_PROFILE,
  type Chip8InstructionSet,
  type Chip8Profile,
  type Chip8Quirks,
  CLASSIC_CHIP8_PROFILE,
  SUPERCHIP_MODERN_PROFILE,
  SUPERCHIP_PROFILE,
} from "../../mod.ts";

Deno.test("Core public API exposes the built-in CHIP-8 profiles", () => {
  const profiles: readonly Chip8Profile[] = [
    CLASSIC_CHIP8_PROFILE,
    CHIP48_PROFILE,
    SUPERCHIP_PROFILE,
    SUPERCHIP_MODERN_PROFILE,
  ];

  assertEquals(profiles.length, 4);
});

Deno.test("Core public API exposes instruction-set and quirk profile types", () => {
  const classicInstructionSet: Chip8InstructionSet = CLASSIC_CHIP8_PROFILE.instructionSet;

  const modernSuperChipInstructionSet: Chip8InstructionSet =
    SUPERCHIP_MODERN_PROFILE.instructionSet;

  const quirks: Chip8Quirks = CLASSIC_CHIP8_PROFILE.quirks;

  assertEquals(classicInstructionSet.kind, "chip8");
  assertEquals(modernSuperChipInstructionSet.kind, "superchip-modern");
  assertEquals(quirks.shiftSource, "vy");
});
