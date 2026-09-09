import type { Address, Byte, CpuState, InstructionTrace } from "@chip8nx/core";

import type { InstructionTraceFormatter } from "@chip8nx/inspection";

export interface WebInspectionViewModel {
  readonly cpu: CpuInspectionViewModel;
  readonly traces: readonly InstructionTraceRowViewModel[];
}

export interface CpuInspectionViewModel {
  readonly registers: readonly RegisterViewModel[];

  readonly indexRegister: string;
  readonly programCounter: string;

  readonly stack: readonly string[];

  readonly delayTimer: string;
  readonly soundTimer: string;
}

export interface RegisterViewModel {
  readonly name: string;
  readonly value: string;
}

export interface InstructionTraceRowViewModel {
  readonly outcome: InstructionTrace["outcome"];
  readonly text: string;
}

/**
 * Creates the display-ready data consumed by the Web inspection UI.
 *
 * Core and Inspection values are converted into host-facing values here so
 * DOM rendering does not need to understand CHIP-8 domain formatting.
 */
export function createWebInspectionViewModel(
  cpuState: CpuState,
  traces: readonly InstructionTrace[],
  traceFormatter: InstructionTraceFormatter,
): WebInspectionViewModel {
  return {
    cpu: {
      registers: cpuState.registers.map((value, index) => ({
        name: formatRegisterName(index),
        value: formatByte(value),
      })),

      indexRegister: formatAddress(cpuState.index),
      programCounter: formatAddress(cpuState.programCounter),

      stack: cpuState.stack.map(formatAddress),

      delayTimer: formatByte(cpuState.delayTimer),
      soundTimer: formatByte(cpuState.soundTimer),
    },

    traces: traces.map((trace) => ({
      outcome: trace.outcome,
      text: traceFormatter.format(trace),
    })),
  };
}

function formatRegisterName(index: number): string {
  return `V${index.toString(16).toUpperCase()}`;
}

function formatByte(value: Byte): string {
  return `0x${value.toString(16).toUpperCase().padStart(2, "0")}`;
}

function formatAddress(value: Address): string {
  return `0x${value.toString(16).toUpperCase().padStart(3, "0")}`;
}
