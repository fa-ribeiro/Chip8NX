import { assertEquals, assertThrows } from "@std/assert";

import { byte } from "./byte.ts";

Deno.test("byte() accepts the minimum value", () => {
  assertEquals(byte(0x00), 0x00);
});

Deno.test("byte() accepts a value in the valid range", () => {
  assertEquals(byte(0x13), 0x13);
});

Deno.test("byte() accepts the maximum value", () => {
  assertEquals(byte(0xff), 0xff);
});

Deno.test("byte() rejects negative values", () => {
  assertThrows(
    () => byte(-1),
    RangeError,
  );
});

Deno.test("byte() rejects values greater than 0xFF", () => {
  assertThrows(
    () => byte(0x100),
    RangeError,
  );
});

Deno.test("byte() rejects fractional values", () => {
  assertThrows(
    () => byte(1.5),
    RangeError,
  );
});

Deno.test("byte() rejects NaN", () => {
  assertThrows(
    () => byte(Number.NaN),
    RangeError,
  );
});

Deno.test("byte() rejects positive infinity", () => {
  assertThrows(
    () => byte(Number.POSITIVE_INFINITY),
    RangeError,
  );
});

Deno.test("byte() rejects negative infinity", () => {
  assertThrows(
    () => byte(Number.NEGATIVE_INFINITY),
    RangeError,
  );
});
