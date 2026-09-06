import {
  assertEquals,
  assertNotStrictEquals,
  assertStrictEquals,
  assertThrows,
} from "@std/assert";

import { address } from "../core/types/address.ts";
import { byte } from "../core/types/byte.ts";
import { opcode } from "../core/types/opcode.ts";
import type { CpuState } from "../cpu/state/cpu-state.ts";
import type {
  FailedInstructionTrace,
  SuccessfulInstructionTrace,
} from "./instruction-trace.ts";
import { InstructionTraceBuffer } from "./instruction-trace-buffer.ts";

function cpuState(programCounter: number): CpuState {
  return {
    registers: Array.from({ length: 16 }, () => byte(0)),
    index: address(0),
    programCounter: address(programCounter),
    stack: [],
    delayTimer: byte(0),
    soundTimer: byte(0),
  };
}

function successfulTrace(programCounter: number): SuccessfulInstructionTrace {
  return {
    outcome: "success",
    instruction: {
      kind: "clear-screen",
      opcode: opcode(0x00e0),
    },
    before: cpuState(programCounter),
    after: cpuState(programCounter + 2),
  };
}

function failedTrace(programCounter: number): FailedInstructionTrace {
  return {
    outcome: "failure",
    opcode: opcode(0xffff),
    before: cpuState(programCounter),
    after: cpuState(programCounter + 2),
    error: new Error("Invalid opcode"),
  };
}

Deno.test("InstructionTraceBuffer rejects invalid capacities", () => {
  for (const capacity of [0, -1, 1.5, Number.NaN, Number.POSITIVE_INFINITY]) {
    assertThrows(() => new InstructionTraceBuffer(capacity), RangeError);
  }
});

Deno.test("InstructionTraceBuffer retains traces from oldest to newest", () => {
  const buffer = new InstructionTraceBuffer(3);

  const first = successfulTrace(0x200);
  const second = successfulTrace(0x202);
  const third = successfulTrace(0x204);

  buffer.observe(first);
  buffer.observe(second);
  buffer.observe(third);

  assertEquals(buffer.capacity, 3);
  assertEquals(buffer.size, 3);

  const snapshot = buffer.snapshot();

  assertStrictEquals(snapshot[0], first);
  assertStrictEquals(snapshot[1], second);
  assertStrictEquals(snapshot[2], third);
});

Deno.test("InstructionTraceBuffer discards the oldest trace when full", () => {
  const buffer = new InstructionTraceBuffer(3);

  const first = successfulTrace(0x200);
  const second = successfulTrace(0x202);
  const third = successfulTrace(0x204);
  const fourth = successfulTrace(0x206);
  const fifth = successfulTrace(0x208);

  buffer.observe(first);
  buffer.observe(second);
  buffer.observe(third);
  buffer.observe(fourth);

  assertEquals(buffer.size, 3);

  let snapshot = buffer.snapshot();

  assertStrictEquals(snapshot[0], second);
  assertStrictEquals(snapshot[1], third);
  assertStrictEquals(snapshot[2], fourth);

  buffer.observe(fifth);

  snapshot = buffer.snapshot();

  assertStrictEquals(snapshot[0], third);
  assertStrictEquals(snapshot[1], fourth);
  assertStrictEquals(snapshot[2], fifth);
});

Deno.test("InstructionTraceBuffer snapshot does not expose mutable storage", () => {
  const buffer = new InstructionTraceBuffer(2);

  const first = successfulTrace(0x200);

  buffer.observe(first);

  const firstSnapshot = buffer.snapshot();
  const secondSnapshot = buffer.snapshot();

  assertNotStrictEquals(firstSnapshot, secondSnapshot);
  assertStrictEquals(firstSnapshot[0], first);
  assertStrictEquals(secondSnapshot[0], first);
});

Deno.test("InstructionTraceBuffer clear removes history and preserves capacity", () => {
  const buffer = new InstructionTraceBuffer(2);

  buffer.observe(successfulTrace(0x200));
  buffer.observe(successfulTrace(0x202));

  buffer.clear();

  assertEquals(buffer.capacity, 2);
  assertEquals(buffer.size, 0);
  assertEquals(buffer.snapshot(), []);

  const next = successfulTrace(0x300);

  buffer.observe(next);

  assertEquals(buffer.size, 1);
  assertStrictEquals(buffer.snapshot()[0], next);
});

Deno.test("InstructionTraceBuffer retains successful and failed traces identically", () => {
  const buffer = new InstructionTraceBuffer(2);

  const success = successfulTrace(0x200);
  const failure = failedTrace(0x202);

  buffer.observe(success);
  buffer.observe(failure);

  const snapshot = buffer.snapshot();

  assertStrictEquals(snapshot[0], success);
  assertStrictEquals(snapshot[1], failure);

  assertEquals(snapshot[0]?.outcome, "success");
  assertEquals(snapshot[1]?.outcome, "failure");
});
