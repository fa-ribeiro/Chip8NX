import { assertEquals } from "@std/assert";

import { address, byte, type Instruction, opcode, registerIndex } from "@chip8nx/core";

import { ClassicInstructionFormatter } from "./classic-instruction-formatter.ts";

const formatter = new ClassicInstructionFormatter();

interface FormatCase {
  readonly name: string;
  readonly instruction: Instruction;
  readonly expected: string;
}

const cases: readonly FormatCase[] = [
  {
    name: "formats CLS",
    instruction: {
      kind: "clear-screen",
      opcode: opcode(0x00e0),
    },
    expected: "CLS",
  },
  {
    name: "formats RET",
    instruction: {
      kind: "return",
      opcode: opcode(0x00ee),
    },
    expected: "RET",
  },
  {
    name: "formats SYS address",
    instruction: {
      kind: "system-call",
      opcode: opcode(0x0123),
      address: address(0x123),
    },
    expected: "SYS 0x123",
  },
  {
    name: "formats JP address",
    instruction: {
      kind: "jump",
      opcode: opcode(0x1234),
      address: address(0x234),
    },
    expected: "JP 0x234",
  },
  {
    name: "formats CALL address",
    instruction: {
      kind: "call",
      opcode: opcode(0x2234),
      address: address(0x234),
    },
    expected: "CALL 0x234",
  },

  {
    name: "formats SE register and immediate",
    instruction: {
      kind: "skip-equal-immediate",
      opcode: opcode(0x3a0a),
      register: registerIndex(0xa),
      value: byte(0x0a),
    },
    expected: "SE VA, 0x0A",
  },
  {
    name: "formats SNE register and immediate",
    instruction: {
      kind: "skip-not-equal-immediate",
      opcode: opcode(0x4f00),
      register: registerIndex(0xf),
      value: byte(0x00),
    },
    expected: "SNE VF, 0x00",
  },
  {
    name: "formats SE register and register",
    instruction: {
      kind: "skip-equal-register",
      opcode: opcode(0x50b0),
      x: registerIndex(0x0),
      y: registerIndex(0xb),
    },
    expected: "SE V0, VB",
  },
  {
    name: "formats LD register and immediate",
    instruction: {
      kind: "load-immediate",
      opcode: opcode(0x6aff),
      register: registerIndex(0xa),
      value: byte(0xff),
    },
    expected: "LD VA, 0xFF",
  },
  {
    name: "formats ADD register and immediate",
    instruction: {
      kind: "add-immediate",
      opcode: opcode(0x7101),
      register: registerIndex(0x1),
      value: byte(0x01),
    },
    expected: "ADD V1, 0x01",
  },

  {
    name: "formats LD register operation",
    instruction: {
      kind: "register-operation",
      opcode: opcode(0x8ab0),
      operation: "assign",
      x: registerIndex(0xa),
      y: registerIndex(0xb),
    },
    expected: "LD VA, VB",
  },
  {
    name: "formats OR register operation",
    instruction: {
      kind: "register-operation",
      opcode: opcode(0x8ab1),
      operation: "or",
      x: registerIndex(0xa),
      y: registerIndex(0xb),
    },
    expected: "OR VA, VB",
  },
  {
    name: "formats AND register operation",
    instruction: {
      kind: "register-operation",
      opcode: opcode(0x8ab2),
      operation: "and",
      x: registerIndex(0xa),
      y: registerIndex(0xb),
    },
    expected: "AND VA, VB",
  },
  {
    name: "formats XOR register operation",
    instruction: {
      kind: "register-operation",
      opcode: opcode(0x8ab3),
      operation: "xor",
      x: registerIndex(0xa),
      y: registerIndex(0xb),
    },
    expected: "XOR VA, VB",
  },
  {
    name: "formats ADD register operation",
    instruction: {
      kind: "register-operation",
      opcode: opcode(0x8ab4),
      operation: "add",
      x: registerIndex(0xa),
      y: registerIndex(0xb),
    },
    expected: "ADD VA, VB",
  },
  {
    name: "formats SUB register operation",
    instruction: {
      kind: "register-operation",
      opcode: opcode(0x8ab5),
      operation: "subtract",
      x: registerIndex(0xa),
      y: registerIndex(0xb),
    },
    expected: "SUB VA, VB",
  },
  {
    name: "formats SHR register operation",
    instruction: {
      kind: "register-operation",
      opcode: opcode(0x8ab6),
      operation: "shift-right",
      x: registerIndex(0xa),
      y: registerIndex(0xb),
    },
    expected: "SHR VA, VB",
  },
  {
    name: "formats SUBN register operation",
    instruction: {
      kind: "register-operation",
      opcode: opcode(0x8ab7),
      operation: "reverse-subtract",
      x: registerIndex(0xa),
      y: registerIndex(0xb),
    },
    expected: "SUBN VA, VB",
  },
  {
    name: "formats SHL register operation",
    instruction: {
      kind: "register-operation",
      opcode: opcode(0x8abe),
      operation: "shift-left",
      x: registerIndex(0xa),
      y: registerIndex(0xb),
    },
    expected: "SHL VA, VB",
  },

  {
    name: "formats SNE register and register",
    instruction: {
      kind: "skip-not-equal-register",
      opcode: opcode(0x9ab0),
      x: registerIndex(0xa),
      y: registerIndex(0xb),
    },
    expected: "SNE VA, VB",
  },
  {
    name: "formats LD index and address",
    instruction: {
      kind: "set-index",
      opcode: opcode(0xa000),
      address: address(0x000),
    },
    expected: "LD I, 0x000",
  },
  {
    name: "formats JP V0 and address",
    instruction: {
      kind: "jump-with-offset",
      opcode: opcode(0xbfff),
      address: address(0xfff),
    },
    expected: "JP V0, 0xFFF",
  },
  {
    name: "formats RND register and byte",
    instruction: {
      kind: "random-and",
      opcode: opcode(0xcaff),
      register: registerIndex(0xa),
      mask: byte(0xff),
    },
    expected: "RND VA, 0xFF",
  },
  {
    name: "formats DRW registers and nibble",
    instruction: {
      kind: "draw-sprite",
      opcode: opcode(0xdabf),
      x: registerIndex(0xa),
      y: registerIndex(0xb),
      height: 0xf,
    },
    expected: "DRW VA, VB, 0xF",
  },

  {
    name: "formats SKP register",
    instruction: {
      kind: "skip-key-pressed",
      opcode: opcode(0xea9e),
      register: registerIndex(0xa),
    },
    expected: "SKP VA",
  },
  {
    name: "formats SKNP register",
    instruction: {
      kind: "skip-key-not-pressed",
      opcode: opcode(0xeaa1),
      register: registerIndex(0xa),
    },
    expected: "SKNP VA",
  },

  {
    name: "formats LD register and delay timer",
    instruction: {
      kind: "get-delay-timer",
      opcode: opcode(0xfa07),
      register: registerIndex(0xa),
    },
    expected: "LD VA, DT",
  },
  {
    name: "formats LD register and key",
    instruction: {
      kind: "wait-for-key",
      opcode: opcode(0xfa0a),
      register: registerIndex(0xa),
    },
    expected: "LD VA, K",
  },
  {
    name: "formats LD delay timer and register",
    instruction: {
      kind: "set-delay-timer",
      opcode: opcode(0xfa15),
      register: registerIndex(0xa),
    },
    expected: "LD DT, VA",
  },
  {
    name: "formats LD sound timer and register",
    instruction: {
      kind: "set-sound-timer",
      opcode: opcode(0xfa18),
      register: registerIndex(0xa),
    },
    expected: "LD ST, VA",
  },
  {
    name: "formats ADD index and register",
    instruction: {
      kind: "add-to-index",
      opcode: opcode(0xfa1e),
      register: registerIndex(0xa),
    },
    expected: "ADD I, VA",
  },
  {
    name: "formats LD sprite and register",
    instruction: {
      kind: "set-index-to-sprite",
      opcode: opcode(0xfa29),
      register: registerIndex(0xa),
    },
    expected: "LD F, VA",
  },
  {
    name: "formats LD BCD and register",
    instruction: {
      kind: "store-bcd",
      opcode: opcode(0xfa33),
      register: registerIndex(0xa),
    },
    expected: "LD B, VA",
  },
  {
    name: "formats LD memory and register",
    instruction: {
      kind: "store-registers",
      opcode: opcode(0xfa55),
      register: registerIndex(0xa),
    },
    expected: "LD [I], VA",
  },
  {
    name: "formats LD register and memory",
    instruction: {
      kind: "load-registers",
      opcode: opcode(0xfa65),
      register: registerIndex(0xa),
    },
    expected: "LD VA, [I]",
  },
];

for (const testCase of cases) {
  Deno.test(testCase.name, () => {
    assertEquals(formatter.format(testCase.instruction), testCase.expected);
  });
}
