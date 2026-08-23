import { assert } from "@std/assert";
import { PerformanceClock } from "./performance-clock.ts";

Deno.test("PerformanceClock returns an integer timestamp", () => {
  const clock = new PerformanceClock();

  const current = clock.now();

  assert(typeof current === "bigint");
});

Deno.test("PerformanceClock returns a non-negative timestamp", () => {
  const clock = new PerformanceClock();

  const current = clock.now();

  assert(current >= 0n);
});

Deno.test("PerformanceClock is monotonic", () => {
  const clock = new PerformanceClock();

  const first = clock.now();
  const second = clock.now();

  assert(second >= first);
});
