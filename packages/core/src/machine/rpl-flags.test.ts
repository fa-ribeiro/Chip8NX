import { assertEquals, assertThrows } from "@std/assert";

import { byte } from "../core/types/byte.ts";
import { registerIndex } from "../cpu/registers/register-index.ts";
import { RplFlags } from "./rpl-flags.ts";

Deno.test("RPL flags start cleared", () => {
  const flags = new RplFlags();

  for (let index = 0; index <= 7; index++) {
    assertEquals(flags.get(registerIndex(index)), byte(0));
  }
});

Deno.test("RPL flags store bytes independently", () => {
  const flags = new RplFlags();

  flags.set(registerIndex(2), byte(0x42));

  flags.set(registerIndex(7), byte(0xab));

  assertEquals(flags.get(registerIndex(2)), byte(0x42));

  assertEquals(flags.get(registerIndex(7)), byte(0xab));

  assertEquals(flags.get(registerIndex(3)), byte(0x00));
});

Deno.test("RPL flags reject registers above V7", () => {
  const flags = new RplFlags();

  assertThrows(
    () => flags.get(registerIndex(8)),
    RangeError,
    "Invalid RPL flag index: 8. Expected V0 through V7.",
  );

  assertThrows(
    () => flags.set(registerIndex(15), byte(0x42)),
    RangeError,
    "Invalid RPL flag index: 15. Expected V0 through V7.",
  );
});
