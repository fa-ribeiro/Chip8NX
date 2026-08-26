import { assertEquals } from "@std/assert";

import { address } from "../core/types/address.ts";
import { byte } from "../core/types/byte.ts";
import { opcode } from "../core/types/opcode.ts";
import { registerIndex } from "../cpu/registers/register-index.ts";

import { getN, getNN, getNNN, getX, getY } from "./opcode-fields.ts";

Deno.test("getX extracts bits 11..8", () => {
  assertEquals(getX(opcode(0x6A42)), registerIndex(0xA));
});

Deno.test("getX extracts zero", () => {
  assertEquals(getX(opcode(0x6000)), registerIndex(0));
});

Deno.test("getX extracts the maximum register index", () => {
  assertEquals(getX(opcode(0x6F00)), registerIndex(0xF));
});

Deno.test("getY extracts bits 7..4", () => {
  assertEquals(getY(opcode(0x8AB4)), registerIndex(0xB));
});

Deno.test("getY extracts zero", () => {
  assertEquals(getY(opcode(0x8000)), registerIndex(0));
});

Deno.test("getY extracts the maximum register index", () => {
  assertEquals(getY(opcode(0x80F0)), registerIndex(0xF));
});

Deno.test("getN extracts bits 3..0", () => {
  assertEquals(getN(opcode(0x8AB7)), 0x7);
});

Deno.test("getNN extracts bits 7..0", () => {
  assertEquals(getNN(opcode(0x6A42)), byte(0x42));
});

Deno.test("getNN extracts the maximum byte", () => {
  assertEquals(getNN(opcode(0x6AFF)), byte(0xFF));
});

Deno.test("getNNN extracts bits 11..0", () => {
  assertEquals(getNNN(opcode(0x1ABC)), address(0xABC));
});

Deno.test("getNNN extracts the maximum address", () => {
  assertEquals(getNNN(opcode(0x1FFF)), address(0xFFF));
});
