import { assert, assertEquals, assertStrictEquals } from "@std/assert";

import {
  address,
  byte,
  type CpuState,
  Decoder,
  type InstructionTraceObserver,
  MemoryImage,
  MemoryImageLoader,
  opcode,
  Ram,
  registerIndex,
  type SuccessfulInstructionTrace,
} from "@chip8nx/core";

import {
  ClassicInstructionFormatter,
  ClassicInstructionTraceFormatter,
  Disassembler,
  InstructionTraceBuffer,
  StateChangeInstructionTraceFormatter,
} from "../../mod.ts";

Deno.test("public API disassembles a CHIP-8 program", () => {
  // prettier-ignore
  // deno-fmt-ignore
  const rom = new Uint8Array([
    0x00, 0xe0, // CLS
    0x60, 0x01, // LD V0, 0x01
    0x61, 0x02, // LD V1, 0x02
    0x80, 0x14, // ADD V0, V1
    0x12, 0x00, // JP 0x200
  ]);

  const memory = new Ram(0x1000);
  const image = new MemoryImage(rom);

  new MemoryImageLoader().load(memory, address(0x200), image);

  const disassembler = new Disassembler(new Decoder(), new ClassicInstructionFormatter());

  const result = disassembler.disassemble(memory, address(0x200), rom.length);

  assertEquals(
    result.map((entry) => ({
      address: entry.address,
      text: entry.text,
    })),
    [
      {
        address: address(0x200),
        text: "CLS",
      },
      {
        address: address(0x202),
        text: "LD V0, 0x01",
      },
      {
        address: address(0x204),
        text: "LD V1, 0x02",
      },
      {
        address: address(0x206),
        text: "ADD V0, V1",
      },
      {
        address: address(0x208),
        text: "JP 0x200",
      },
    ],
  );
});

Deno.test("public APIs compose Core observation with Inspection history and formatting", () => {
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
