import { assertEquals } from "@std/assert";

import { address } from "../core/types/address.ts";
import { byte } from "../core/types/byte.ts";
import { opcode } from "../core/types/opcode.ts";
import { registerIndex } from "../cpu/registers/register-index.ts";

import type { ClearScreenInstruction, JumpInstruction, LoadImmediateInstruction } from "./instruction.ts";

Deno.test("ClearScreenInstruction represents 00E0", () => {
  const instruction: ClearScreenInstruction = {
    kind: "clear-screen",
    opcode: opcode(0x00e0),
  };

  assertEquals(instruction.kind, "clear-screen");
  assertEquals(instruction.opcode, opcode(0x00e0));
});

Deno.test("JumpInstruction contains its target address", () => {
  const instruction: JumpInstruction = {
    kind: "jump",
    opcode: opcode(0x1234),
    address: address(0x234),
  };

  assertEquals(instruction.kind, "jump");
  assertEquals(instruction.opcode, opcode(0x1234));
  assertEquals(instruction.address, address(0x234));
});

Deno.test("LoadImmediateInstruction contains register and value", () => {
  const instruction: LoadImmediateInstruction = {
    kind: "load-immediate",
    opcode: opcode(0x6a42),
    register: registerIndex(0xa),
    value: byte(0x42),
  };

  assertEquals(instruction.kind, "load-immediate");
  assertEquals(instruction.opcode, opcode(0x6a42));
  assertEquals(instruction.register, registerIndex(0xa));
  assertEquals(instruction.value, byte(0x42));
});

Deno.test("Instruction discriminated union can be narrowed by kind", () => {
  const instructions = [
    {
      kind: "clear-screen",
      opcode: opcode(0x00e0),
    } satisfies ClearScreenInstruction,

    {
      kind: "jump",
      opcode: opcode(0x1234),
      address: address(0x234),
    } satisfies JumpInstruction,

    {
      kind: "load-immediate",
      opcode: opcode(0x6a42),
      register: registerIndex(0xa),
      value: byte(0x42),
    } satisfies LoadImmediateInstruction,
  ];

  for (const instruction of instructions) {
    switch (instruction.kind) {
      case "clear-screen":
        assertEquals(instruction.opcode, opcode(0x00e0));
        break;

      case "jump":
        assertEquals(instruction.address, address(0x234));
        break;

      case "load-immediate":
        assertEquals(instruction.register, registerIndex(0xa));
        assertEquals(instruction.value, byte(0x42));
        break;
    }
  }
});
