import { assertEquals, assertThrows } from "@std/assert";

import { opcode } from "./opcode.ts";

Deno.test("opcode accepts the minimum value", () => {
  assertEquals(opcode(0x0000), 0x0000);
});

Deno.test("opcode accepts the maximum value", () => {
  assertEquals(opcode(0xFFFF), 0xFFFF);
});

Deno.test("opcode accepts a valid CHIP-8 opcode", () => {
  assertEquals(opcode(0x6A42), 0x6A42);
});

Deno.test("opcode rejects negative values", () => {
  assertThrows(
    () => opcode(-1),
    RangeError,
  );
});

Deno.test("opcode rejects values above 16 bits", () => {
  assertThrows(
    () => opcode(0x10000),
    RangeError,
  );
});

Deno.test("opcode rejects fractional values", () => {
  assertThrows(
    () => opcode(1.5),
    RangeError,
  );
});
