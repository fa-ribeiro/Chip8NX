import { assertEquals } from "@std/assert";

import { address } from "../core/types/address.ts";
import { byte } from "../core/types/byte.ts";
import { opcode } from "../core/types/opcode.ts";
import { registerIndex } from "../cpu/registers/register-index.ts";
import type { CpuState } from "../cpu/state/cpu-state.ts";
import { ClassicInstructionFormatter } from "../disassembly/classic-instruction-formatter.ts";
import type { InstructionFormatter } from "../disassembly/instruction-formatter.ts";
import type { InstructionTrace } from "./instruction-trace.ts";
import { ClassicInstructionTraceFormatter } from "./classic-instruction-trace-formatter.ts";

Deno.test("formats source address, opcode, and delegated instruction text", () => {
  const instructionFormatter: InstructionFormatter = {
    format: () => "FORMATTED",
  };
  const formatter = new ClassicInstructionTraceFormatter(instructionFormatter);
  const trace = createTrace(0x234, 0x456);

  assertEquals(formatter.format(trace), "0x234 6AFF FORMATTED");
});

Deno.test("formats Classic instruction text without appending a newline", () => {
  const formatter = new ClassicInstructionTraceFormatter(
    new ClassicInstructionFormatter(),
  );
  const trace = createTrace(0x200, 0x202);

  assertEquals(formatter.format(trace), "0x200 6AFF LD VA, 0xFF");
});

function createTrace(
  beforeProgramCounter: number,
  afterProgramCounter: number,
): InstructionTrace {
  return {
    instruction: {
      kind: "load-immediate",
      opcode: opcode(0x6aff),
      register: registerIndex(0xa),
      value: byte(0xff),
    },
    before: createState(beforeProgramCounter),
    after: createState(afterProgramCounter),
  };
}

function createState(programCounter: number): CpuState {
  return {
    registers: Array.from({ length: 16 }, () => byte(0)),
    index: address(0),
    programCounter: address(programCounter),
    stack: [],
    delayTimer: byte(0),
    soundTimer: byte(0),
  };
}
