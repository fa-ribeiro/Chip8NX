import { assertEquals, assertThrows } from "@std/assert";

import { address } from "./address.ts";

Deno.test("address() accepts zero", () => {
  assertEquals(address(0x000), 0x000);
});

Deno.test("address() accepts a typical address", () => {
  assertEquals(address(0x200), 0x200);
});

Deno.test("address() accepts the Classic CHIP-8 maximum address", () => {
  assertEquals(address(0xfff), 0xfff);
});

Deno.test("address() accepts addresses beyond the Classic CHIP-8 range", () => {
  assertEquals(address(0x1000), 0x1000);
});

Deno.test("address() accepts large non-negative addresses", () => {
  assertEquals(address(0xffff), 0xffff);
});

Deno.test("address() rejects negative values", () => {
  assertThrows(
    () => address(-1),
    RangeError,
  );
});

Deno.test("address() rejects fractional values", () => {
  assertThrows(
    () => address(1.5),
    RangeError,
  );
});

Deno.test("address() rejects NaN", () => {
  assertThrows(
    () => address(Number.NaN),
    RangeError,
  );
});

Deno.test("address() rejects positive infinity", () => {
  assertThrows(
    () => address(Number.POSITIVE_INFINITY),
    RangeError,
  );
});

Deno.test("address() rejects negative infinity", () => {
  assertThrows(
    () => address(Number.NEGATIVE_INFINITY),
    RangeError,
  );
});
