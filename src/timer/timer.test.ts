import { assertEquals } from "@std/assert";

import { byte } from "../core/types/byte.ts";
import { Timer } from "./timer.ts";

Deno.test("starts at zero", () => {
  const timer = new Timer();

  assertEquals(timer.getValue(), byte(0));
});

Deno.test("can be set to a value", () => {
  const timer = new Timer();

  timer.setValue(byte(42));

  assertEquals(timer.getValue(), byte(42));
});

Deno.test("tick decrements a non-zero timer", () => {
  const timer = new Timer();

  timer.setValue(byte(42));

  timer.tick();

  assertEquals(timer.getValue(), byte(41));
});

Deno.test("tick decrements repeatedly", () => {
  const timer = new Timer();

  timer.setValue(byte(3));

  timer.tick();
  timer.tick();
  timer.tick();

  assertEquals(
    timer.getValue(),
    byte(0),
  );
});

Deno.test("timer remains zero after reaching zero", () => {
  const timer = new Timer();

  timer.setValue(byte(1));

  timer.tick();
  timer.tick();

  assertEquals(
    timer.getValue(),
    byte(0),
  );
});

Deno.test("zero timer does not underflow", () => {
  const timer = new Timer();

  timer.tick();

  assertEquals(timer.getValue(), byte(0));
});

Deno.test("can be reset after ticking", () => {
  const timer = new Timer();

  timer.setValue(byte(10));
  timer.tick();
  timer.tick();

  timer.setValue(byte(20));

  assertEquals(timer.getValue(), byte(20));
});

Deno.test("supports the maximum byte value", () => {
  const timer = new Timer();

  timer.setValue(byte(255));

  assertEquals(timer.getValue(), byte(255));

  timer.tick();

  assertEquals(timer.getValue(), byte(254));
});
