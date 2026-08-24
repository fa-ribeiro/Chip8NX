import { assertEquals, assertThrows } from "@std/assert";

import { registerIndex } from "./register-index.ts";

Deno.test("RegisterIndex accepts register index 0", () => {
  assertEquals(registerIndex(0), 0);
});

Deno.test("RegisterIndex accepts register index 15", () => {
  assertEquals(registerIndex(15), 15);
});

Deno.test("RegisterIndex accepts all valid register indices", () => {
  for (let index = 0; index <= 0x0F; index++) {
    assertEquals(registerIndex(index), index);
  }
});

Deno.test("RegisterIndex rejects negative register indices", () => {
  assertThrows(
    () => registerIndex(-1),
    RangeError,
  );
});

Deno.test("RegisterIndex rejects register index 16", () => {
  assertThrows(
    () => registerIndex(16),
    RangeError,
  );
});

Deno.test("RegisterIndex rejects fractional register indices", () => {
  assertThrows(
    () => registerIndex(1.5),
    RangeError,
  );
});
