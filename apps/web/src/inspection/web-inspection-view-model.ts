import type { Address, Byte, CpuState, InstructionTrace, Opcode } from "@chip8nx/core";

import type { DisassembledInstruction, InstructionTraceFormatter } from "@chip8nx/inspection";

export interface WebInspectionViewModel {
  readonly cpu: CpuInspectionViewModel;
  readonly currentInstruction: CurrentInstructionViewModel;
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

export type CurrentInstructionInspection =
  | SuccessfulCurrentInstructionInspection
  | FailedCurrentInstructionInspection;

export interface SuccessfulCurrentInstructionInspection {
  readonly outcome: "success";
  readonly instruction: DisassembledInstruction;
}

export interface FailedCurrentInstructionInspection {
  readonly outcome: "failure";
  readonly address: Address;
  readonly error: unknown;
}

export type CurrentInstructionViewModel =
  | AvailableCurrentInstructionViewModel
  | UnavailableCurrentInstructionViewModel;

export interface AvailableCurrentInstructionViewModel {
  readonly availability: "available";

  readonly address: string;
  readonly opcode: string;
  readonly text: string;
}

export interface UnavailableCurrentInstructionViewModel {
  readonly availability: "unavailable";

  readonly address: string;
  readonly reason: string;
}

/**
 * Creates the display-ready data consumed by the Web inspection UI.
 *
 * Core and Inspection values are converted into host-facing values here so
 * DOM rendering does not need to understand CHIP-8 domain formatting.
 */
export function createWebInspectionViewModel(
  cpuState: CpuState,
  currentInstruction: CurrentInstructionInspection,
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

    currentInstruction: createCurrentInstructionViewModel(currentInstruction),

    traces: traces.map((trace) => ({
      outcome: trace.outcome,
      text: traceFormatter.format(trace),
    })),
  };
}

/**
 * Converts the result of passive current-instruction inspection into
 * display-ready Web data.
 */
export function createCurrentInstructionViewModel(
  inspection: CurrentInstructionInspection,
): CurrentInstructionViewModel {
  if (inspection.outcome === "failure") {
    return {
      availability: "unavailable",
      address: formatAddress(inspection.address),
      reason: formatInspectionError(inspection.error),
    };
  }

  return {
    availability: "available",
    address: formatAddress(inspection.instruction.address),
    opcode: formatOpcode(inspection.instruction.instruction.opcode),
    text: inspection.instruction.text,
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

function formatOpcode(value: Opcode): string {
  return value.toString(16).toUpperCase().padStart(4, "0");
}

function formatInspectionError(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
