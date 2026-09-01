import { assertEquals } from "@std/assert";

import { byte } from "../core/types/byte.ts";
import { Timer } from "./timer.ts";

Deno.test("Timer starts at zero by default", () => {
  const timer = new Timer();

  assertEquals(timer.getValue(), byte(0));
});

Deno.test("Timer can be initialized with a value", () => {
  const timer = new Timer(byte(42));

  assertEquals(timer.getValue(), byte(42));
});

Deno.test("setValue changes the timer value", () => {
  const timer = new Timer();

  timer.setValue(byte(42));

  assertEquals(timer.getValue(), byte(42));
});

Deno.test("Timer tick decrements a non-zero timer", () => {
  const timer = new Timer(byte(42));

  timer.tick();

  assertEquals(timer.getValue(), byte(41));
});

Deno.test("Timer tick reaches zero", () => {
  const timer = new Timer(byte(1));

  timer.tick();

  assertEquals(timer.getValue(), byte(0));
});

Deno.test("Timer tick does not underflow below zero", () => {
  const timer = new Timer(byte(0));

  timer.tick();

  assertEquals(timer.getValue(), byte(0));
});

Deno.test("Timer remains at zero after repeated ticks", () => {
  const timer = new Timer(byte(0));

  timer.tick();
  timer.tick();
  timer.tick();

  assertEquals(timer.getValue(), byte(0));
});
