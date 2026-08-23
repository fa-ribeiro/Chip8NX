import { assertEquals, assertThrows } from "@std/assert";
import { key } from "./key.ts";

Deno.test("key() accepts 0x0", () => {
  assertEquals(key(0x0), 0x0);
});

Deno.test("key() accepts a key in the valid range", () => {
  assertEquals(key(0x7), 0x7);
});

Deno.test("key() accepts 0xF", () => {
  assertEquals(key(0xf), 0xf);
});

Deno.test("key() rejects negative values", () => {
  assertThrows(
    () => key(-1),
    RangeError,
  );
});

Deno.test("key() rejects values greater than 0xF", () => {
  assertThrows(
    () => key(0x10),
    RangeError,
  );
});

Deno.test("key() rejects fractional values", () => {
  assertThrows(
    () => key(1.5),
    RangeError,
  );
});

Deno.test("key() rejects NaN", () => {
  assertThrows(
    () => key(Number.NaN),
    RangeError,
  );
});

Deno.test("key() rejects positive infinity", () => {
  assertThrows(
    () => key(Number.POSITIVE_INFINITY),
    RangeError,
  );
});

Deno.test("key() rejects negative infinity", () => {
  assertThrows(
    () => key(Number.NEGATIVE_INFINITY),
    RangeError,
  );
});
