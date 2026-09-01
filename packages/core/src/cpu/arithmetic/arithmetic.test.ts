import { assertEquals } from "@std/assert";

import { byte } from "../../core/types/byte.ts";
import { add8, shiftLeft8, shiftRight8, subtract8 } from "./arithmetic.ts";

Deno.test("add8 adds bytes without carry", () => {
  const result = add8(byte(0x12), byte(0x34));

  assertEquals(result.value, byte(0x46));
  assertEquals(result.flag, false);
});

Deno.test("add8 returns 0xFF without setting carry", () => {
  const result = add8(byte(0xfe), byte(0x01));

  assertEquals(result.value, byte(0xff));
  assertEquals(result.flag, false);
});

Deno.test("add8 wraps and sets carry on overflow", () => {
  const result = add8(byte(0xff), byte(0x01));

  assertEquals(result.value, byte(0x00));
  assertEquals(result.flag, true);
});

Deno.test("add8 handles zero operands", () => {
  const result = add8(byte(0x00), byte(0x00));

  assertEquals(result.value, byte(0x00));
  assertEquals(result.flag, false);
});

Deno.test("subtract8 subtracts without borrow", () => {
  const result = subtract8(byte(0x05), byte(0x03));

  assertEquals(result.value, byte(0x02));
  assertEquals(result.flag, true);
});

Deno.test("subtract8 treats equal operands as no borrow", () => {
  const result = subtract8(byte(0x05), byte(0x05));

  assertEquals(result.value, byte(0x00));
  assertEquals(result.flag, true);
});

Deno.test("subtract8 wraps and reports borrow", () => {
  const result = subtract8(byte(0x03), byte(0x05));

  assertEquals(result.value, byte(0xfe));
  assertEquals(result.flag, false);
});

Deno.test("subtract8 handles zero operands", () => {
  const result = subtract8(byte(0x00), byte(0x00));

  assertEquals(result.value, byte(0x00));
  assertEquals(result.flag, true);
});

Deno.test("shiftRight8 shifts right and captures the old LSB", () => {
  const result = shiftRight8(byte(0b0000_0011));

  assertEquals(result.value, byte(0b0000_0001));
  assertEquals(result.flag, true);
});

Deno.test("shiftRight8 clears the flag when the old LSB is zero", () => {
  const result = shiftRight8(byte(0b0000_0010));

  assertEquals(result.value, byte(0b0000_0001));
  assertEquals(result.flag, false);
});

Deno.test("shiftRight8 handles zero", () => {
  const result = shiftRight8(byte(0x00));

  assertEquals(result.value, byte(0x00));
  assertEquals(result.flag, false);
});

Deno.test("shiftLeft8 shifts left and captures the old MSB", () => {
  const result = shiftLeft8(byte(0b1000_0001));

  assertEquals(result.value, byte(0b0000_0010));
  assertEquals(result.flag, true);
});

Deno.test("shiftLeft8 clears the flag when the old MSB is zero", () => {
  const result = shiftLeft8(byte(0b0100_0001));

  assertEquals(result.value, byte(0b1000_0010));
  assertEquals(result.flag, false);
});

Deno.test("shiftLeft8 handles zero", () => {
  const result = shiftLeft8(byte(0x00));

  assertEquals(result.value, byte(0x00));
  assertEquals(result.flag, false);
});
