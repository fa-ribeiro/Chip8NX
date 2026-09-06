import { assertEquals } from "@std/assert";

import { address } from "../core/types/address.ts";
import { byte } from "../core/types/byte.ts";
import { opcode } from "../core/types/opcode.ts";
import type { CpuState } from "../cpu/state/cpu-state.ts";
import type {
  FailedInstructionTrace,
  SuccessfulInstructionTrace,
} from "./instruction-trace.ts";
import type { InstructionTraceFormatter } from "./instruction-trace-formatter.ts";
import { StateChangeInstructionTraceFormatter } from "./state-change-instruction-trace-formatter.ts";

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

const baseFormatter: InstructionTraceFormatter = { format: () => "TRACE" };

Deno.test("appends changed CPU state", () => {
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

  const trace: SuccessfulInstructionTrace = {
    outcome: "success",
    instruction: { kind: "clear-screen", opcode: opcode(0x00e0) },
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

Deno.test("preserves base output when CPU state is unchanged", () => {
  const state = cpuState();
  const trace: SuccessfulInstructionTrace = {
    outcome: "success",
    instruction: { kind: "clear-screen", opcode: opcode(0x00e0) },
    before: state,
    after: state,
  };

  const formatter = new StateChangeInstructionTraceFormatter(baseFormatter);
  assertEquals(formatter.format(trace), "TRACE");
});

Deno.test("appends CPU changes to failed traces", () => {
  const trace: FailedInstructionTrace = {
    outcome: "failure",
    opcode: opcode(0xffff),
    before: cpuState(),
    after: cpuState({ programCounter: address(0x202) }),
    error: new Error("Invalid opcode"),
  };

  const failedBase: InstructionTraceFormatter = { format: () => "FAILED" };
  const formatter = new StateChangeInstructionTraceFormatter(failedBase);
  assertEquals(formatter.format(trace), "FAILED                       | PC:0x200 → 0x202");
});
