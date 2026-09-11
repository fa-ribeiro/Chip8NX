import { assertEquals } from "@std/assert";

import { CHIP48_PROFILE, type Chip8Profile, CLASSIC_CHIP8_PROFILE } from "../../mod.ts";

Deno.test("Core public API exposes the built-in CHIP-8 profiles", () => {
  const profiles: readonly Chip8Profile[] = [CLASSIC_CHIP8_PROFILE, CHIP48_PROFILE];

  assertEquals(profiles.length, 2);
});
