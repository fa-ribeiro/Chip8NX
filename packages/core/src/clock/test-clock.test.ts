import { assertEquals, assertThrows } from "@std/assert";

import { Duration, duration } from "../core/types/duration.ts";
import { TestClock } from "./test-clock.ts";

Deno.test("TestClock starts at timestamp zero", () => {
  const clock = new TestClock();

  assertEquals(clock.now(), 0n);
});

Deno.test("TestClock advances by the requested duration", () => {
  const clock = new TestClock();

  clock.advance(duration(1_000_000_000n as Duration));

  assertEquals(clock.now(), 1_000_000_000n);
});

Deno.test("TestClock can be advanced multiple times", () => {
  const clock = new TestClock();

  clock.advance(duration(1_000_000_000n as Duration));
  clock.advance(duration(500_000_000n as Duration));

  assertEquals(clock.now(), 1_500_000_000n);
});

Deno.test("TestClock accepts a zero duration", () => {
  const clock = new TestClock();

  clock.advance(duration(0n as Duration));

  assertEquals(clock.now(), 0n);
});

Deno.test("TestClock rejects a negative duration", () => {
  const clock = new TestClock();

  assertThrows(() => clock.advance(duration(-1n as Duration)), RangeError);
});

Deno.test("TestClock remains unchanged when advance throws", () => {
  const clock = new TestClock();

  clock.advance(duration(1_000_000_000n as Duration));

  assertThrows(() => clock.advance(duration(-1n as Duration)), RangeError);

  assertEquals(clock.now(), 1_000_000_000n);
});

Deno.test("TestClock is monotonic", () => {
  const clock = new TestClock();

  const first = clock.now();

  clock.advance(duration(100n as Duration));

  const second = clock.now();

  clock.advance(duration(200n as Duration));

  const third = clock.now();

  assertEquals(first <= second, true);
  assertEquals(second <= third, true);
});
