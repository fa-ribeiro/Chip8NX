import { assertEquals } from "@std/assert";

import { address } from "../core/types/address.ts";
import { byte } from "../core/types/byte.ts";
import { opcode } from "../core/types/opcode.ts";
import type { CpuState } from "../cpu/state/cpu-state.ts";
import type { InstructionTrace } from "./instruction-trace.ts";
import type { InstructionTraceFormatter } from "./instruction-trace-formatter.ts";
import { StateChangeInstructionTraceFormatter } from "./state-change-instruction-trace-formatter.ts";

const STATE_CHANGE_SEPARATOR = " → ";

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

const baseFormatter: InstructionTraceFormatter = {
  format(): string {
    return "TRACE";
  },
};

Deno.test("StateChangeInstructionTraceFormatter appends changed CPU state", () => {
  const before = cpuState();

  const registers = [...before.registers];
  registers[0xa] = byte(0x42);

  const after = cpuState({
    registers,
    index: address(0x300),
    programCounter: address(0x202),
    stack: [address(0x222)],
    delayTimer: byte(0x05),
    soundTimer: byte(0x06),
  });

  const trace: InstructionTrace = {
    instruction: {
      kind: "clear-screen",
      opcode: opcode(0x00e0),
    },
    before,
    after,
  };

  const formatter = new StateChangeInstructionTraceFormatter(baseFormatter);

  assertEquals(
    formatter.format(trace),
    "TRACE                        | " +
      "VA:0x00 → 0x42; " +
      "I :0x000 → 0x300; " +
      "PC:0x200 → 0x202; " +
      "STACK:[] → [0x222]; " +
      "DT:0x00 → 0x05; " +
      "ST:0x00 → 0x06",
  );
});

Deno.test(
  "StateChangeInstructionTraceFormatter preserves base output when CPU state is unchanged",
  () => {
    const state = cpuState();

    const trace: InstructionTrace = {
      instruction: {
        kind: "clear-screen",
        opcode: opcode(0x00e0),
      },
      before: state,
      after: state,
    };

    const formatter = new StateChangeInstructionTraceFormatter(baseFormatter);

    assertEquals(formatter.format(trace), "TRACE");
  },
);

Deno.test("StateChangeInstructionTraceFormatter aligns and separates multiple changes", () => {
  const before = cpuState();

  const registers = [...before.registers];
  registers[1] = byte(0x05);

  const after = cpuState({
    registers,
    programCounter: address(0x202),
  });

  const trace: InstructionTrace = {
    instruction: {
      kind: "clear-screen",
      opcode: opcode(0x00e0),
    },
    before,
    after,
  };

  const formatter = new StateChangeInstructionTraceFormatter(baseFormatter);

  assertEquals(
    formatter.format(trace),
    "TRACE                        | " + "V1:0x00 → 0x05; " + "PC:0x200 → 0x202",
  );
});
