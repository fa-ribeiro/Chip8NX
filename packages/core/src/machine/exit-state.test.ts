import { assertEquals } from "@std/assert";

import { ExitState } from "./exit-state.ts";

Deno.test("ExitState starts in the running state", () => {
  const exitState = new ExitState();

  assertEquals(exitState.isExited, false);
});

Deno.test("ExitState records and resets interpreter exit", () => {
  const exitState = new ExitState();

  exitState.exit();

  assertEquals(exitState.isExited, true);

  exitState.reset();

  assertEquals(exitState.isExited, false);
});
