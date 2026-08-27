import { assertEquals, assertThrows } from "@std/assert";

import { Frequency } from "./frequency.ts";

Deno.test("creates an integer frequency", () => {
  const frequency = Frequency.fromInteger(60n);

  assertEquals(frequency.numerator, 60n);
  assertEquals(frequency.denominator, 1n);
});

Deno.test("creates a frequency from a ratio", () => {
  const frequency = Frequency.fromRatio(2997n, 50n);

  assertEquals(frequency.numerator, 2997n);
  assertEquals(frequency.denominator, 50n);
});

Deno.test("normalizes a ratio", () => {
  const frequency = Frequency.fromRatio(60n, 2n);

  assertEquals(frequency.numerator, 30n);
  assertEquals(frequency.denominator, 1n);
});

Deno.test("normalizes a ratio with a common divisor", () => {
  const frequency = Frequency.fromRatio(300n, 10n);

  assertEquals(frequency.numerator, 30n);
  assertEquals(frequency.denominator, 1n);
});

Deno.test("preserves an already normalized ratio", () => {
  const frequency = Frequency.fromRatio(2997n, 50n);

  assertEquals(frequency.numerator, 2997n);
  assertEquals(frequency.denominator, 50n);
});

Deno.test("rejects a zero numerator", () => {
  assertThrows(() => new Frequency(0n), RangeError, "Frequency numerator must be positive.");
});

Deno.test("rejects a negative numerator", () => {
  assertThrows(() => new Frequency(-1n), RangeError, "Frequency numerator must be positive.");
});

Deno.test("rejects a zero denominator", () => {
  assertThrows(() => new Frequency(1n, 0n), RangeError, "Frequency denominator must be positive.");
});

Deno.test("rejects a negative denominator", () => {
  assertThrows(() => new Frequency(1n, -1n), RangeError, "Frequency denominator must be positive.");
});

Deno.test("normalization does not change the represented frequency", () => {
  const frequency = Frequency.fromRatio(120n, 4n);

  assertEquals(frequency.numerator, 30n);
  assertEquals(frequency.denominator, 1n);
});

Deno.test("represents 59.94 Hz exactly as a rational value", () => {
  const frequency = Frequency.fromRatio(2997n, 50n);

  assertEquals(frequency.numerator, 2997n);
  assertEquals(frequency.denominator, 50n);
});
