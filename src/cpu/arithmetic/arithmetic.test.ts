import { assertEquals } from "@std/assert";
import { byte } from "../../core/types/byte.ts";
import { add8, shiftLeft8, shiftRight8, subtract8 } from "./arithmetic.ts";

Deno.test("add8 adds two bytes without carry", () => {
  const result = add8(byte(0x12), byte(0x34));

  assertEquals(result.value, byte(0x46));
  assertEquals(result.flag, false);
});

Deno.test("add8 wraps and reports carry", () => {
  const result = add8(byte(0xff), byte(0x01));

  assertEquals(result.value, byte(0x00));
  assertEquals(result.flag, true);
});

Deno.test("add8 does not report carry for exact 0xff", () => {
  const result = add8(byte(0xfe), byte(0x01));

  assertEquals(result.value, byte(0xff));
  assertEquals(result.flag, false);
});

Deno.test("subtract8 reports no borrow when a is greater", () => {
  const result = subtract8(byte(0x05), byte(0x03));

  assertEquals(result.value, byte(0x02));
  assertEquals(result.flag, true);
});

Deno.test("subtract8 reports no borrow when operands are equal", () => {
  const result = subtract8(byte(0x05), byte(0x05));

  assertEquals(result.value, byte(0x00));
  assertEquals(result.flag, true);
});

Deno.test("subtract8 wraps and reports borrow", () => {
  const result = subtract8(byte(0x03), byte(0x05));

  assertEquals(result.value, byte(0xfe));
  assertEquals(result.flag, false);
});

Deno.test("shiftRight8 captures the old least-significant bit", () => {
  const result = shiftRight8(byte(0b0000_0011));

  assertEquals(result.value, byte(0b0000_0001));
  assertEquals(result.flag, true);
});

Deno.test("shiftRight8 clears the flag when the old least-significant bit is zero", () => {
  const result = shiftRight8(byte(0b0000_0010));

  assertEquals(result.value, byte(0b0000_0001));
  assertEquals(result.flag, false);
});

Deno.test("shiftLeft8 captures the old most-significant bit", () => {
  const result = shiftLeft8(byte(0b1000_0001));

  assertEquals(result.value, byte(0b0000_0010));
  assertEquals(result.flag, true);
});

Deno.test("shiftLeft8 clears the flag when the old most-significant bit is zero", () => {
  const result = shiftLeft8(byte(0b0100_0001));

  assertEquals(result.value, byte(0b1000_0010));
  assertEquals(result.flag, false);
});

Deno.test("add8 detects carry", () => {
  const result = add8(byte(0xff), byte(0x01));

  assertEquals(result.value, byte(0x00));
  assertEquals(result.flag, true);
});

Deno.test("add8 detects no carry", () => {
  const result = add8(byte(0x12), byte(0x34));

  assertEquals(result.value, byte(0x46));
  assertEquals(result.flag, false);
});

Deno.test("subtract8 reports no borrow when operands are equal", () => {
  const result = subtract8(byte(0x42), byte(0x42));

  assertEquals(result.value, byte(0x00));
  assertEquals(result.flag, true);
});

Deno.test("subtract8 reports borrow", () => {
  const result = subtract8(byte(0x03), byte(0x05));

  assertEquals(result.value, byte(0xfe));
  assertEquals(result.flag, false);
});

Deno.test("shiftRight8 captures the old least-significant bit", () => {
  const result = shiftRight8(byte(0b0000_0011));

  assertEquals(result.value, byte(0b0000_0001));
  assertEquals(result.flag, true);
});

Deno.test("shiftLeft8 captures the old most-significant bit", () => {
  const result = shiftLeft8(byte(0b1000_0001));

  assertEquals(result.value, byte(0b0000_0010));
  assertEquals(result.flag, true);
});
