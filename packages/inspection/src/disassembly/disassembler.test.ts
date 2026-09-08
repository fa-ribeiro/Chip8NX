import { assertEquals, assertThrows } from "@std/assert";

import {
  address,
  byte,
  Decoder,
  InvalidOpcodeError,
  opcode,
  Ram,
  registerIndex,
} from "@chip8nx/core";

import { Disassembler } from "./disassembler.ts";
import type { InstructionFormatter } from "../instruction/formatting/instruction-formatter.ts";

const formatter: InstructionFormatter = { format: () => "CUSTOM" };
const disassembler = new Disassembler(new Decoder(), formatter);

Deno.test("disassembleAt decodes and formats one instruction", () => {
  const memory = new Ram(0x1000);
  memory.write(address(0x200), byte(0x6a));
  memory.write(address(0x201), byte(0x42));

  const result = disassembler.disassembleAt(memory, address(0x200));
  assertEquals(result.address, address(0x200));
  assertEquals(result.instruction, {
    kind: "load-immediate",
    opcode: opcode(0x6a42),
    register: registerIndex(0xa),
    value: byte(0x42),
  });
  assertEquals(result.text, "CUSTOM");
});

Deno.test("disassembleAt propagates InvalidOpcodeError", () => {
  const memory = new Ram(0x1000);
  memory.write(address(0x200), byte(0xff));
  memory.write(address(0x201), byte(0xff));
  assertThrows(() => disassembler.disassembleAt(memory, address(0x200)), InvalidOpcodeError);
});

Deno.test("disassembleAt propagates RangeError for incomplete instruction", () => {
  const memory = new Ram(0x1000);
  memory.write(address(0xfff), byte(0x60));
  assertThrows(() => disassembler.disassembleAt(memory, address(0xfff)), RangeError);
});

Deno.test("disassemble returns no instructions for zero byte length", () => {
  const memory = new Ram(0x1000);
  assertEquals(disassembler.disassemble(memory, address(0xfff), 0), []);
});

Deno.test("disassemble traverses complete instructions in address order", () => {
  const memory = new Ram(0x1000);
  memory.write(address(0x200), byte(0x60));
  memory.write(address(0x201), byte(0x01));
  memory.write(address(0x202), byte(0x71));
  memory.write(address(0x203), byte(0x02));
  memory.write(address(0x204), byte(0x12));
  memory.write(address(0x205), byte(0x00));

  const result = disassembler.disassemble(memory, address(0x200), 6);
  assertEquals(
    result.map((entry) => entry.address),
    [address(0x200), address(0x202), address(0x204)],
  );
  assertEquals(
    result.map((entry) => entry.instruction.opcode),
    [opcode(0x6001), opcode(0x7102), opcode(0x1200)],
  );
});

Deno.test("disassemble ignores an unmatched trailing byte", () => {
  const memory = new Ram(0x1000);
  memory.write(address(0x200), byte(0x60));
  memory.write(address(0x201), byte(0x01));
  memory.write(address(0x202), byte(0x71));
  memory.write(address(0x203), byte(0x02));
  memory.write(address(0x204), byte(0xff));

  const result = disassembler.disassemble(memory, address(0x200), 5);
  assertEquals(result.length, 2);
  assertEquals(
    result.map((entry) => entry.address),
    [address(0x200), address(0x202)],
  );
});

const invalidByteLengths = [
  -1,
  1.5,
  Number.NaN,
  Number.POSITIVE_INFINITY,
  Number.MAX_SAFE_INTEGER + 1,
];
for (const byteLength of invalidByteLengths) {
  Deno.test(`disassemble rejects invalid byte length ${byteLength}`, () => {
    const memory = new Ram(0x1000);
    assertThrows(
      () => disassembler.disassemble(memory, address(0x200), byteLength),
      RangeError,
    );
  });
}

Deno.test("disassemble propagates InvalidOpcodeError", () => {
  const memory = new Ram(0x1000);
  memory.write(address(0x200), byte(0x60));
  memory.write(address(0x201), byte(0x01));
  memory.write(address(0x202), byte(0x8a));
  memory.write(address(0x203), byte(0xb8));
  assertThrows(() => disassembler.disassemble(memory, address(0x200), 4), InvalidOpcodeError);
});

Deno.test("disassemble propagates RangeError when the range exceeds memory", () => {
  const memory = new Ram(0x1000);
  memory.write(address(0xffe), byte(0x60));
  memory.write(address(0xfff), byte(0x01));
  assertThrows(() => disassembler.disassemble(memory, address(0xffe), 4), RangeError);
});
