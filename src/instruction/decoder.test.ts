import { assertEquals, assertThrows } from "@std/assert";

import { address } from "../core/types/address.ts";
import { byte } from "../core/types/byte.ts";
import { opcode } from "../core/types/opcode.ts";
import { registerIndex } from "../cpu/registers/register-index.ts";
import { Decoder, InvalidOpcodeError } from "./decoder.ts";

const decoder = new Decoder();

Deno.test("decodes 00E0 as clear screen", () => {
  assertEquals(decoder.decode(opcode(0x00e0)), {
    kind: "clear-screen",
    opcode: opcode(0x00e0),
  });
});

Deno.test("decodes 00EE as return", () => {
  assertEquals(decoder.decode(opcode(0x00ee)), {
    kind: "return",
    opcode: opcode(0x00ee),
  });
});

Deno.test("decodes 0NNN as system call", () => {
  assertEquals(decoder.decode(opcode(0x0123)), {
    kind: "system-call",
    opcode: opcode(0x0123),
    address: address(0x123),
  });
});

Deno.test("decodes 1NNN as jump", () => {
  assertEquals(decoder.decode(opcode(0x1abc)), {
    kind: "jump",
    opcode: opcode(0x1abc),
    address: address(0xabc),
  });
});

Deno.test("decodes 2NNN as call", () => {
  assertEquals(decoder.decode(opcode(0x2abc)), {
    kind: "call",
    opcode: opcode(0x2abc),
    address: address(0xabc),
  });
});

Deno.test("decodes 3XNN", () => {
  assertEquals(decoder.decode(opcode(0x3a42)), {
    kind: "skip-equal-immediate",
    opcode: opcode(0x3a42),
    register: registerIndex(0xa),
    value: byte(0x42),
  });
});

Deno.test("decodes 4XNN", () => {
  assertEquals(decoder.decode(opcode(0x4a42)), {
    kind: "skip-not-equal-immediate",
    opcode: opcode(0x4a42),
    register: registerIndex(0xa),
    value: byte(0x42),
  });
});

Deno.test("decodes 5XY0", () => {
  assertEquals(decoder.decode(opcode(0x5ab0)), {
    kind: "skip-equal-register",
    opcode: opcode(0x5ab0),
    x: registerIndex(0xa),
    y: registerIndex(0xb),
  });
});

Deno.test("decodes 6XNN", () => {
  assertEquals(decoder.decode(opcode(0x6a42)), {
    kind: "load-immediate",
    opcode: opcode(0x6a42),
    register: registerIndex(0xa),
    value: byte(0x42),
  });
});

Deno.test("decodes 7XNN", () => {
  assertEquals(decoder.decode(opcode(0x7a42)), {
    kind: "add-immediate",
    opcode: opcode(0x7a42),
    register: registerIndex(0xa),
    value: byte(0x42),
  });
});

Deno.test("decodes 8XY0", () => {
  assertEquals(decoder.decode(opcode(0x8ab0)), {
    kind: "register-operation",
    opcode: opcode(0x8ab0),
    operation: "assign",
    x: registerIndex(0xa),
    y: registerIndex(0xb),
  });
});

Deno.test("decodes 8XY1", () => {
  assertEquals(decoder.decode(opcode(0x8ab1)), {
    kind: "register-operation",
    opcode: opcode(0x8ab1),
    operation: "or",
    x: registerIndex(0xa),
    y: registerIndex(0xb),
  });
});

Deno.test("decodes 8XY2", () => {
  assertEquals(decoder.decode(opcode(0x8ab2)), {
    kind: "register-operation",
    opcode: opcode(0x8ab2),
    operation: "and",
    x: registerIndex(0xa),
    y: registerIndex(0xb),
  });
});

Deno.test("decodes 8XY3", () => {
  assertEquals(decoder.decode(opcode(0x8ab3)), {
    kind: "register-operation",
    opcode: opcode(0x8ab3),
    operation: "xor",
    x: registerIndex(0xa),
    y: registerIndex(0xb),
  });
});

Deno.test("decodes 8XY4", () => {
  assertEquals(decoder.decode(opcode(0x8ab4)), {
    kind: "register-operation",
    opcode: opcode(0x8ab4),
    operation: "add",
    x: registerIndex(0xa),
    y: registerIndex(0xb),
  });
});

Deno.test("decodes 8XY5", () => {
  assertEquals(decoder.decode(opcode(0x8ab5)), {
    kind: "register-operation",
    opcode: opcode(0x8ab5),
    operation: "subtract",
    x: registerIndex(0xa),
    y: registerIndex(0xb),
  });
});

Deno.test("decodes 8XY6", () => {
  assertEquals(decoder.decode(opcode(0x8ab6)), {
    kind: "register-operation",
    opcode: opcode(0x8ab6),
    operation: "shift-right",
    x: registerIndex(0xa),
    y: registerIndex(0xb),
  });
});

Deno.test("decodes 8XY7", () => {
  assertEquals(decoder.decode(opcode(0x8ab7)), {
    kind: "register-operation",
    opcode: opcode(0x8ab7),
    operation: "reverse-subtract",
    x: registerIndex(0xa),
    y: registerIndex(0xb),
  });
});

Deno.test("decodes 8XYE", () => {
  assertEquals(decoder.decode(opcode(0x8abe)), {
    kind: "register-operation",
    opcode: opcode(0x8abe),
    operation: "shift-left",
    x: registerIndex(0xa),
    y: registerIndex(0xb),
  });
});

Deno.test("decodes 9XY0", () => {
  assertEquals(decoder.decode(opcode(0x9ab0)), {
    kind: "skip-not-equal-register",
    opcode: opcode(0x9ab0),
    x: registerIndex(0xa),
    y: registerIndex(0xb),
  });
});

Deno.test("decodes ANNN", () => {
  assertEquals(decoder.decode(opcode(0xaabc)), {
    kind: "set-index",
    opcode: opcode(0xaabc),
    address: address(0xabc),
  });
});

Deno.test("decodes BNNN", () => {
  assertEquals(decoder.decode(opcode(0xbabc)), {
    kind: "jump-with-offset",
    opcode: opcode(0xbabc),
    address: address(0xabc),
  });
});

Deno.test("decodes CXNN", () => {
  assertEquals(decoder.decode(opcode(0xca42)), {
    kind: "random-and",
    opcode: opcode(0xca42),
    register: registerIndex(0xa),
    mask: byte(0x42),
  });
});

Deno.test("decodes DXYN", () => {
  assertEquals(decoder.decode(opcode(0xdab5)), {
    kind: "draw",
    opcode: opcode(0xdab5),
    x: registerIndex(0xa),
    y: registerIndex(0xb),
    height: 5,
  });
});

Deno.test("decodes EX9E", () => {
  assertEquals(decoder.decode(opcode(0xea9e)), {
    kind: "skip-key-pressed",
    opcode: opcode(0xea9e),
    register: registerIndex(0xa),
  });
});

Deno.test("decodes EXA1", () => {
  assertEquals(decoder.decode(opcode(0xeaa1)), {
    kind: "skip-key-not-pressed",
    opcode: opcode(0xeaa1),
    register: registerIndex(0xa),
  });
});

Deno.test("decodes FX07", () => {
  assertEquals(decoder.decode(opcode(0xfa07)), {
    kind: "get-delay-timer",
    opcode: opcode(0xfa07),
    register: registerIndex(0xa),
  });
});

Deno.test("decodes FX0A", () => {
  assertEquals(decoder.decode(opcode(0xfa0a)), {
    kind: "wait-for-key",
    opcode: opcode(0xfa0a),
    register: registerIndex(0xa),
  });
});

Deno.test("decodes FX15", () => {
  assertEquals(decoder.decode(opcode(0xfa15)), {
    kind: "set-delay-timer",
    opcode: opcode(0xfa15),
    register: registerIndex(0xa),
  });
});

Deno.test("decodes FX18", () => {
  assertEquals(decoder.decode(opcode(0xfa18)), {
    kind: "set-sound-timer",
    opcode: opcode(0xfa18),
    register: registerIndex(0xa),
  });
});

Deno.test("decodes FX1E", () => {
  assertEquals(decoder.decode(opcode(0xfa1e)), {
    kind: "add-to-index",
    opcode: opcode(0xfa1e),
    register: registerIndex(0xa),
  });
});

Deno.test("decodes FX29", () => {
  assertEquals(decoder.decode(opcode(0xfa29)), {
    kind: "set-index-to-sprite",
    opcode: opcode(0xfa29),
    register: registerIndex(0xa),
  });
});

Deno.test("decodes FX33", () => {
  assertEquals(decoder.decode(opcode(0xfa33)), {
    kind: "store-bcd",
    opcode: opcode(0xfa33),
    register: registerIndex(0xa),
  });
});

Deno.test("decodes FX55", () => {
  assertEquals(decoder.decode(opcode(0xfa55)), {
    kind: "store-registers",
    opcode: opcode(0xfa55),
    register: registerIndex(0xa),
  });
});

Deno.test("decodes FX65", () => {
  assertEquals(decoder.decode(opcode(0xfa65)), {
    kind: "load-registers",
    opcode: opcode(0xfa65),
    register: registerIndex(0xa),
  });
});

Deno.test("rejects invalid 5XYN opcode", () => {
  assertThrows(() => decoder.decode(opcode(0x5ab1)), InvalidOpcodeError);
});

Deno.test("rejects invalid 8XYN opcode", () => {
  assertThrows(() => decoder.decode(opcode(0x8ab8)), InvalidOpcodeError);
});

Deno.test("rejects invalid 9XYN opcode", () => {
  assertThrows(() => decoder.decode(opcode(0x9ab1)), InvalidOpcodeError);
});

Deno.test("rejects invalid EXNN opcode", () => {
  assertThrows(() => decoder.decode(opcode(0xeaff)), InvalidOpcodeError);
});

Deno.test("rejects invalid FXNN opcode", () => {
  assertThrows(() => decoder.decode(opcode(0xfaff)), InvalidOpcodeError);
});
