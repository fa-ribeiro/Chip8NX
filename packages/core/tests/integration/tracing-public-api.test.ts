import { assert, assertEquals, assertStrictEquals } from "@std/assert";
import {
  address,
  byte,
  ClassicInstructionFormatter,
  ClassicInstructionTraceFormatter,
  type CpuState,
  InstructionTraceBuffer,
  type InstructionTraceObserver,
  opcode,
  registerIndex,
  StateChangeInstructionTraceFormatter,
  type SuccessfulInstructionTrace,
} from "../../mod.ts";

function cpuState(programCounter: number, register0 = 0): CpuState {
  const registers = Array.from({ length: 16 }, (_, index) => byte(index === 0 ? register0 : 0));

  return {
    registers,
    index: address(0),
    programCounter: address(programCounter),
    stack: [],
    delayTimer: byte(0),
    soundTimer: byte(0),
  };
}

Deno.test("public tracing API composes observation, history, and formatting", () => {
  const trace: SuccessfulInstructionTrace = {
    outcome: "success",
    instruction: {
      kind: "load-immediate",
      opcode: opcode(0x6042),
      register: registerIndex(0),
      value: byte(0x42),
    },
    before: cpuState(0x200),
    after: cpuState(0x202, 0x42),
  };

  const history = new InstructionTraceBuffer(4);

  const observer: InstructionTraceObserver = history;
  observer.observe(trace);

  const formatter = new StateChangeInstructionTraceFormatter(
    new ClassicInstructionTraceFormatter(new ClassicInstructionFormatter()),
  );

  const snapshot = history.snapshot();
  const retainedTrace = snapshot[0];

  assertEquals(snapshot.length, 1);
  assert(retainedTrace !== undefined);
  assertStrictEquals(retainedTrace, trace);

  assertEquals(
    formatter.format(retainedTrace),
    "0x200 6042 LD V0, 0x42       | " + "V0:0x00 → 0x42; PC:0x200 → 0x202",
  );
});
