import { assertEquals, assertStrictEquals } from "@std/assert";

import {
  Cpu,
  type Instruction,
  type InstructionTrace,
  type InstructionTraceObserver,
  opcode,
} from "../../mod.ts";

Deno.test("public CPU accepts the public instruction trace observer contract", () => {
  const observer: InstructionTraceObserver = {
    observe(_trace: InstructionTrace): void {
      // External consumers receive semantic Core trace data here.
    },
  };

  const cpuObserver: ConstructorParameters<typeof Cpu>[3] = observer;

  assertStrictEquals(cpuObserver, observer);
});

Deno.test("Core public API exposes the discriminated Instruction union", () => {
  const instruction: Instruction = {
    kind: "clear-screen",
    opcode: opcode(0x00e0),
  };

  assertEquals(instruction.kind, "clear-screen");
});
