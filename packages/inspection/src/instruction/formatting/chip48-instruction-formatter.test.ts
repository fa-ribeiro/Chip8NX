import { assertEquals } from "@std/assert";

import { address, opcode, registerIndex } from "@chip8nx/core";

import { Chip48InstructionFormatter } from "./chip48-instruction-formatter.ts";

const formatter = new Chip48InstructionFormatter();

Deno.test("formats CHIP-48 BXNN using the encoded Vx register", () => {
  assertEquals(
    formatter.format({
      kind: "jump-with-offset",
      opcode: opcode(0xbabc),
      register: registerIndex(0xa),
      address: address(0xabc),
    }),
    "JP VA, 0xABC",
  );
});

Deno.test("formats CHIP-48 SHR without the ignored Vy register", () => {
  assertEquals(
    formatter.format({
      kind: "register-operation",
      opcode: opcode(0x8ab6),
      operation: "shift-right",
      x: registerIndex(0xa),
      y: registerIndex(0xb),
    }),
    "SHR VA",
  );
});

Deno.test("formats CHIP-48 SHL without the ignored Vy register", () => {
  assertEquals(
    formatter.format({
      kind: "register-operation",
      opcode: opcode(0x8abe),
      operation: "shift-left",
      x: registerIndex(0xa),
      y: registerIndex(0xb),
    }),
    "SHL VA",
  );
});
