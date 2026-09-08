import { assertStrictEquals } from "@std/assert";

import { Cpu, type InstructionTrace, type InstructionTraceObserver } from "../../mod.ts";

Deno.test("public CPU accepts the public instruction trace observer contract", () => {
  const observer: InstructionTraceObserver = {
    observe(_trace: InstructionTrace): void {
      // External consumers receive semantic Core trace data here.
    },
  };

  const cpuObserver: ConstructorParameters<typeof Cpu>[3] = observer;

  assertStrictEquals(cpuObserver, observer);
});
