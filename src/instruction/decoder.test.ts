import { assertEquals, assertThrows } from "@std/assert";

import { address } from "../core/types/address.ts";
import { byte } from "../core/types/byte.ts";
import { opcode } from "../core/types/opcode.ts";
import { registerIndex } from "../cpu/registers/register-index.ts";
import { Decoder, InvalidOpcodeError } from "./decoder.ts";

const decoder = new Decoder();

Deno.test("decodes 00E0 as clear screen", () => {
  assertEquals(decoder.decode(opcode(0x00E0)), {
    kind: "clear-screen",
    opcode: opcode(0x00E0),
  });
});

Deno.test("decodes 00EE as return", () => {
  assertEquals(decoder.decode(opcode(0x00EE)), {
    kind: "return",
    opcode: opcode(0x00EE),
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
  assertEquals(decoder.decode(opcode(0x1ABC)), {
    kind: "jump",
    opcode: opcode(0x1ABC),
    address: address(0xABC),
  });
});

Deno.test("decodes 2NNN as call", () => {
  assertEquals(decoder.decode(opcode(0x2ABC)), {
    kind: "call",
    opcode: opcode(0x2ABC),
    address: address(0xABC),
  });
});

Deno.test("decodes 3XNN", () => {
  assertEquals(decoder.decode(opcode(0x3A42)), {
    kind: "skip-equal-immediate",
    opcode: opcode(0x3A42),
    register: registerIndex(0xA),
    value: byte(0x42),
  });
});

Deno.test("decodes 4XNN", () => {
  assertEquals(decoder.decode(opcode(0x4A42)), {
    kind: "skip-not-equal-immediate",
    opcode: opcode(0x4A42),
    register: registerIndex(0xA),
    value: byte(0x42),
  });
});

Deno.test("decodes 5XY0", () => {
  assertEquals(decoder.decode(opcode(0x5AB0)), {
    kind: "skip-equal-register",
    opcode: opcode(0x5AB0),
    x: registerIndex(0xA),
    y: registerIndex(0xB),
  });
});

Deno.test("decodes 6XNN", () => {
  assertEquals(decoder.decode(opcode(0x6A42)), {
    kind: "load-immediate",
    opcode: opcode(0x6A42),
    register: registerIndex(0xA),
    value: byte(0x42),
  });
});

Deno.test("decodes 7XNN", () => {
  assertEquals(decoder.decode(opcode(0x7A42)), {
    kind: "add-immediate",
    opcode: opcode(0x7A42),
    register: registerIndex(0xA),
    value: byte(0x42),
  });
});

Deno.test("decodes 8XY0", () => {
  assertEquals(decoder.decode(opcode(0x8AB0)), {
    kind: "register-operation",
    opcode: opcode(0x8AB0),
    operation: "assign",
    x: registerIndex(0xA),
    y: registerIndex(0xB),
  });
});

Deno.test("decodes 8XY1", () => {
  assertEquals(decoder.decode(opcode(0x8AB1)), {
    kind: "register-operation",
    opcode: opcode(0x8AB1),
    operation: "or",
    x: registerIndex(0xA),
    y: registerIndex(0xB),
  });
});

Deno.test("decodes 8XY2", () => {
  assertEquals(decoder.decode(opcode(0x8AB2)), {
    kind: "register-operation",
    opcode: opcode(0x8AB2),
    operation: "and",
    x: registerIndex(0xA),
    y: registerIndex(0xB),
  });
});

Deno.test("decodes 8XY3", () => {
  assertEquals(decoder.decode(opcode(0x8AB3)), {
    kind: "register-operation",
    opcode: opcode(0x8AB3),
    operation: "xor",
    x: registerIndex(0xA),
    y: registerIndex(0xB),
  });
});

Deno.test("decodes 8XY4", () => {
  assertEquals(decoder.decode(opcode(0x8AB4)), {
    kind: "register-operation",
    opcode: opcode(0x8AB4),
    operation: "add",
    x: registerIndex(0xA),
    y: registerIndex(0xB),
  });
});

Deno.test("decodes 8XY5", () => {
  assertEquals(decoder.decode(opcode(0x8AB5)), {
    kind: "register-operation",
    opcode: opcode(0x8AB5),
    operation: "subtract",
    x: registerIndex(0xA),
    y: registerIndex(0xB),
  });
});

Deno.test("decodes 8XY6", () => {
  assertEquals(decoder.decode(opcode(0x8AB6)), {
    kind: "register-operation",
    opcode: opcode(0x8AB6),
    operation: "shift-right",
    x: registerIndex(0xA),
    y: registerIndex(0xB),
  });
});

Deno.test("decodes 8XY7", () => {
  assertEquals(decoder.decode(opcode(0x8AB7)), {
    kind: "register-operation",
    opcode: opcode(0x8AB7),
    operation: "reverse-subtract",
    x: registerIndex(0xA),
    y: registerIndex(0xB),
  });
});

Deno.test("decodes 8XYE", () => {
  assertEquals(decoder.decode(opcode(0x8ABE)), {
    kind: "register-operation",
    opcode: opcode(0x8ABE),
    operation: "shift-left",
    x: registerIndex(0xA),
    y: registerIndex(0xB),
  });
});

Deno.test("decodes 9XY0", () => {
  assertEquals(decoder.decode(opcode(0x9AB0)), {
    kind: "skip-not-equal-register",
    opcode: opcode(0x9AB0),
    x: registerIndex(0xA),
    y: registerIndex(0xB),
  });
});

Deno.test("decodes ANNN", () => {
  assertEquals(decoder.decode(opcode(0xAABC)), {
    kind: "set-index",
    opcode: opcode(0xAABC),
    address: address(0xABC),
  });
});

Deno.test("decodes BNNN", () => {
  assertEquals(decoder.decode(opcode(0xBABC)), {
    kind: "jump-with-offset",
    opcode: opcode(0xBABC),
    address: address(0xABC),
  });
});

Deno.test("decodes CXNN", () => {
  assertEquals(decoder.decode(opcode(0xCA42)), {
    kind: "random-and",
    opcode: opcode(0xCA42),
    register: registerIndex(0xA),
    mask: byte(0x42),
  });
});

Deno.test("decodes DXYN", () => {
  assertEquals(decoder.decode(opcode(0xDAB5)), {
    kind: "draw",
    opcode: opcode(0xDAB5),
    x: registerIndex(0xA),
    y: registerIndex(0xB),
    height: 5,
  });
});

Deno.test("decodes EX9E", () => {
  assertEquals(decoder.decode(opcode(0xEA9E)), {
    kind: "skip-key-pressed",
    opcode: opcode(0xEA9E),
    register: registerIndex(0xA),
  });
});

Deno.test("decodes EXA1", () => {
  assertEquals(decoder.decode(opcode(0xEAA1)), {
    kind: "skip-key-not-pressed",
    opcode: opcode(0xEAA1),
    register: registerIndex(0xA),
  });
});

Deno.test("decodes FX07", () => {
  assertEquals(decoder.decode(opcode(0xFA07)), {
    kind: "get-delay-timer",
    opcode: opcode(0xFA07),
    register: registerIndex(0xA),
  });
});

Deno.test("decodes FX0A", () => {
  assertEquals(decoder.decode(opcode(0xFA0A)), {
    kind: "wait-for-key",
    opcode: opcode(0xFA0A),
    register: registerIndex(0xA),
  });
});

Deno.test("decodes FX15", () => {
  assertEquals(decoder.decode(opcode(0xFA15)), {
    kind: "set-delay-timer",
    opcode: opcode(0xFA15),
    register: registerIndex(0xA),
  });
});

Deno.test("decodes FX18", () => {
  assertEquals(decoder.decode(opcode(0xFA18)), {
    kind: "set-sound-timer",
    opcode: opcode(0xFA18),
    register: registerIndex(0xA),
  });
});

Deno.test("decodes FX1E", () => {
  assertEquals(decoder.decode(opcode(0xFA1E)), {
    kind: "add-to-index",
    opcode: opcode(0xFA1E),
    register: registerIndex(0xA),
  });
});

Deno.test("decodes FX29", () => {
  assertEquals(decoder.decode(opcode(0xFA29)), {
    kind: "set-index-to-sprite",
    opcode: opcode(0xFA29),
    register: registerIndex(0xA),
  });
});

Deno.test("decodes FX33", () => {
  assertEquals(decoder.decode(opcode(0xFA33)), {
    kind: "store-bcd",
    opcode: opcode(0xFA33),
    register: registerIndex(0xA),
  });
});

Deno.test("decodes FX55", () => {
  assertEquals(decoder.decode(opcode(0xFA55)), {
    kind: "store-registers",
    opcode: opcode(0xFA55),
    register: registerIndex(0xA),
  });
});

Deno.test("decodes FX65", () => {
  assertEquals(decoder.decode(opcode(0xFA65)), {
    kind: "load-registers",
    opcode: opcode(0xFA65),
    register: registerIndex(0xA),
  });
});

Deno.test("rejects invalid 5XYN opcode", () => {
  assertThrows(
    () => decoder.decode(opcode(0x5AB1)),
    InvalidOpcodeError,
  );
});

Deno.test("rejects invalid 8XYN opcode", () => {
  assertThrows(
    () => decoder.decode(opcode(0x8AB8)),
    InvalidOpcodeError,
  );
});

Deno.test("rejects invalid 9XYN opcode", () => {
  assertThrows(
    () => decoder.decode(opcode(0x9AB1)),
    InvalidOpcodeError,
  );
});

Deno.test("rejects invalid EXNN opcode", () => {
  assertThrows(
    () => decoder.decode(opcode(0xEAFF)),
    InvalidOpcodeError,
  );
});

Deno.test("rejects invalid FXNN opcode", () => {
  assertThrows(
    () => decoder.decode(opcode(0xFAFF)),
    InvalidOpcodeError,
  );
});
