import { assertEquals } from "@std/assert";

import {
  DisplayBuffer,
  type DisplayMode,
  type DisplaySpecification,
  type FixedDisplaySpecification,
  type SpriteDrawResult,
  type SuperChipDisplaySpecification,
} from "../../mod.ts";

Deno.test("Core public API exposes display specification and draw-result types", () => {
  const fixed: FixedDisplaySpecification = {
    kind: "fixed",
    width: 64,
    height: 32,
  };

  const superchip: SuperChipDisplaySpecification = {
    kind: "superchip",
    backingWidth: 128,
    backingHeight: 64,
    initialMode: "low",
  };

  const specifications: readonly DisplaySpecification[] = [fixed, superchip];
  const mode: DisplayMode = "high";
  const result: SpriteDrawResult = {
    collision: false,
    collisionRows: 0,
    clippedBottomRows: 0,
  };

  const display = new DisplayBuffer(superchip, "clip");
  display.setMode(mode);

  assertEquals(specifications.length, 2);
  assertEquals(display.mode, "high");
  assertEquals(result.collision, false);
});
