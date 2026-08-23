import { assertEquals, assertThrows } from "@std/assert";
import { Frequency } from "./frequency.ts";

Deno.test("Frequency constructor accepts a numerator and denominator", () => {
  const frequency = new Frequency(1n, 2n);
  assertEquals(frequency.numerator, 1n);
  assertEquals(frequency.denominator, 2n);
});

Deno.test("Frequency constructor rejects a zero denominator", () => {
  assertThrows(
    () => new Frequency(1n, 0n),
    RangeError,
  );
});

Deno.test("Frequency constructor rejects a negative denominator", () => {
  assertThrows(
    () => new Frequency(1n, -1n),
    RangeError,
  );
});

Deno.test("Frequency constructor rejects a negative numerator", () => {
  assertThrows(
    () => new Frequency(-1n, 1n),
    RangeError,
  );
});

Deno.test("Frequency constructor rejects a zero numerator", () => {
  assertThrows(
    () => new Frequency(0n, 1n),
    RangeError,
  );
});
