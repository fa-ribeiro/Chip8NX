import { assertEquals } from "@std/assert";

import {
  address,
  byte,
  ClassicInstructionFormatter,
  type CpuState,
  type FailedInstructionTrace,
  type InstructionFormatter,
  opcode,
  registerIndex,
  type SuccessfulInstructionTrace,
} from "@chip8nx/core";

import { ClassicInstructionTraceFormatter } from "./classic-instruction-trace-formatter.ts";

function cpuState(overrides: Partial<CpuState> = {}): CpuState {
  return {
    registers: Array.from({ length: 16 }, () => byte(0)),
    index: address(0),
    programCounter: address(0x200),
    stack: [],
    delayTimer: byte(0),
    soundTimer: byte(0),
    ...overrides,
  };
}

const formatter = new ClassicInstructionTraceFormatter(new ClassicInstructionFormatter());

Deno.test("formats source address, opcode, and delegated instruction text", () => {
  const instructionFormatter: InstructionFormatter = {
    format: () => "FORMATTED",
  };

  const delegated = new ClassicInstructionTraceFormatter(instructionFormatter);

  const trace: SuccessfulInstructionTrace = {
    outcome: "success",
    instruction: {
      kind: "load-immediate",
      opcode: opcode(0x6aff),
      register: registerIndex(0xa),
      value: byte(0xff),
    },
    before: cpuState({ programCounter: address(0x234) }),
    after: cpuState({ programCounter: address(0x456) }),
  };

  assertEquals(delegated.format(trace), "0x234 6AFF FORMATTED");
});

Deno.test("formats Classic instruction text without appending a newline", () => {
  const trace: SuccessfulInstructionTrace = {
    outcome: "success",
    instruction: {
      kind: "load-immediate",
      opcode: opcode(0x6aff),
      register: registerIndex(0xa),
      value: byte(0xff),
    },
    before: cpuState({ programCounter: address(0x200) }),
    after: cpuState({ programCounter: address(0x202) }),
  };

  assertEquals(formatter.format(trace), "0x200 6AFF LD VA, 0xFF");
});

Deno.test("formats fetch failures without an opcode", () => {
  const trace: FailedInstructionTrace = {
    outcome: "failure",
    before: cpuState(),
    after: cpuState(),
    error: new RangeError("Address out of range"),
  };

  assertEquals(
    formatter.format(trace),
    "0x200 ???? <fetch failed> [RangeError: Address out of range]",
  );
});

Deno.test("formats decode failures with the opcode", () => {
  const trace: FailedInstructionTrace = {
    outcome: "failure",
    opcode: opcode(0xffff),
    before: cpuState(),
    after: cpuState({ programCounter: address(0x202) }),
    error: new Error("Invalid opcode"),
  };

  assertEquals(formatter.format(trace), "0x200 FFFF <decode failed> [Error: Invalid opcode]");
});

Deno.test("formats execution failures using the decoded instruction", () => {
  const trace: FailedInstructionTrace = {
    outcome: "failure",
    opcode: opcode(0x00ee),
    instruction: { kind: "return", opcode: opcode(0x00ee) },
    before: cpuState(),
    after: cpuState({ programCounter: address(0x202) }),
    error: new RangeError("Stack underflow"),
  };

  assertEquals(formatter.format(trace), "0x200 00EE RET [RangeError: Stack underflow]");
});
