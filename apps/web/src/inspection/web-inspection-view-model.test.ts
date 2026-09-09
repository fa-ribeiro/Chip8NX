import { assertEquals } from "@std/assert";

import {
  address,
  byte,
  type CpuState,
  type FailedInstructionTrace,
  opcode,
  type SuccessfulInstructionTrace,
} from "@chip8nx/core";

import type { InstructionTraceFormatter } from "@chip8nx/inspection";

import { createWebInspectionViewModel } from "./web-inspection-view-model.ts";

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

Deno.test("creates display-ready CPU state", () => {
  const registers = Array.from({ length: 16 }, () => byte(0));

  registers[0] = byte(0x02);
  registers[0xa] = byte(0xab);
  registers[0xf] = byte(0xff);

  const state = cpuState({
    registers,
    index: address(0x2af),
    programCounter: address(0x020),
    stack: [address(0x200), address(0xabc)],
    delayTimer: byte(0x05),
    soundTimer: byte(0x0f),
  });

  const unusedFormatter: InstructionTraceFormatter = {
    format: () => {
      throw new Error("No trace should be formatted");
    },
  };

  const viewModel = createWebInspectionViewModel(state, [], unusedFormatter);

  assertEquals(viewModel.cpu, {
    registers: [
      { name: "V0", value: "0x02" },
      { name: "V1", value: "0x00" },
      { name: "V2", value: "0x00" },
      { name: "V3", value: "0x00" },
      { name: "V4", value: "0x00" },
      { name: "V5", value: "0x00" },
      { name: "V6", value: "0x00" },
      { name: "V7", value: "0x00" },
      { name: "V8", value: "0x00" },
      { name: "V9", value: "0x00" },
      { name: "VA", value: "0xAB" },
      { name: "VB", value: "0x00" },
      { name: "VC", value: "0x00" },
      { name: "VD", value: "0x00" },
      { name: "VE", value: "0x00" },
      { name: "VF", value: "0xFF" },
    ],

    indexRegister: "0x2AF",
    programCounter: "0x020",

    stack: ["0x200", "0xABC"],

    delayTimer: "0x05",
    soundTimer: "0x0F",
  });

  assertEquals(viewModel.traces, []);
});

Deno.test("preserves trace order and delegates trace text formatting", () => {
  const state = cpuState();

  const success: SuccessfulInstructionTrace = {
    outcome: "success",
    instruction: {
      kind: "clear-screen",
      opcode: opcode(0x00e0),
    },
    before: state,
    after: cpuState({
      programCounter: address(0x202),
    }),
  };

  const failure: FailedInstructionTrace = {
    outcome: "failure",
    opcode: opcode(0xffff),
    before: cpuState({
      programCounter: address(0x202),
    }),
    after: cpuState({
      programCounter: address(0x204),
    }),
    error: new Error("Invalid opcode"),
  };

  const formatter: InstructionTraceFormatter = {
    format(trace): string {
      return trace.outcome === "success" ? "FORMATTED SUCCESS" : "FORMATTED FAILURE";
    },
  };

  const viewModel = createWebInspectionViewModel(state, [success, failure], formatter);

  assertEquals(viewModel.traces, [
    {
      outcome: "success",
      text: "FORMATTED SUCCESS",
    },
    {
      outcome: "failure",
      text: "FORMATTED FAILURE",
    },
  ]);
});
