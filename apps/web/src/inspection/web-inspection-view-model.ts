import type { Address, Byte, CpuState, InstructionTrace, Opcode } from "@chip8nx/core";

import type { DisassembledInstruction, InstructionTraceFormatter } from "@chip8nx/inspection";
import { formatWebAddress } from "../address/web-address.ts";

export interface WebInspectionViewModel {
  readonly cpu: CpuInspectionViewModel;
  readonly nearbyInstructions: readonly NearbyInstructionViewModel[];
  readonly traces: readonly InstructionTraceRowViewModel[];
}

export interface CpuInspectionViewModel {
  readonly registers: readonly RegisterViewModel[];

  /** Raw addresses retained for Web debugger navigation actions. */
  readonly indexRegisterAddress: Address;
  readonly programCounterAddress: Address;

  readonly indexRegister: string;
  readonly programCounter: string;

  readonly stack: readonly string[];
  readonly stackCapacity: number;

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

export type NearbyInstructionBreakpointState = "none" | "enabled" | "disabled";

export interface NearbyInstructionInspection {
  readonly address: Address;
  readonly current: boolean;
  readonly breakpoint: NearbyInstructionBreakpointState;
  readonly result:
    | SuccessfulNearbyInstructionInspectionResult
    | FailedNearbyInstructionInspectionResult;
}

export interface SuccessfulNearbyInstructionInspectionResult {
  readonly outcome: "success";
  readonly instruction: DisassembledInstruction;
}

export interface FailedNearbyInstructionInspectionResult {
  readonly outcome: "failure";
  readonly error: unknown;
}

export interface NearbyInstructionViewModel {
  /** Raw address used by Web-only interaction such as breakpoint gutter clicks. */
  readonly addressValue: Address;
  readonly address: string;
  readonly current: boolean;
  readonly breakpoint: NearbyInstructionBreakpointState;
  readonly content: AvailableNearbyInstructionViewModel | UnavailableNearbyInstructionViewModel;
}

export interface AvailableNearbyInstructionViewModel {
  readonly availability: "available";
  readonly opcode: string;
  readonly text: string;
}

export interface UnavailableNearbyInstructionViewModel {
  readonly availability: "unavailable";
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
  stackCapacity: number,
  nearbyInstructions: readonly NearbyInstructionInspection[],
  traces: readonly InstructionTrace[],
  traceFormatter: InstructionTraceFormatter,
): WebInspectionViewModel {
  return {
    cpu: {
      registers: cpuState.registers.map((value, index) => ({
        name: formatRegisterName(index),
        value: formatByte(value),
      })),

      indexRegisterAddress: cpuState.index,
      programCounterAddress: cpuState.programCounter,

      indexRegister: formatWebAddress(cpuState.index),
      programCounter: formatWebAddress(cpuState.programCounter),

      stack: cpuState.stack.map(formatWebAddress),
      stackCapacity,

      delayTimer: formatByte(cpuState.delayTimer),
      soundTimer: formatByte(cpuState.soundTimer),
    },

    nearbyInstructions: createNearbyInstructionViewModels(nearbyInstructions),

    traces: traces.map((trace) => ({
      outcome: trace.outcome,
      text: traceFormatter.format(trace),
    })),
  };
}

export function createNearbyInstructionViewModels(
  inspections: readonly NearbyInstructionInspection[],
): readonly NearbyInstructionViewModel[] {
  return inspections.map(createNearbyInstructionViewModel);
}

function createNearbyInstructionViewModel(
  inspection: NearbyInstructionInspection,
): NearbyInstructionViewModel {
  if (inspection.result.outcome === "failure") {
    return {
      addressValue: inspection.address,
      address: formatWebAddress(inspection.address),
      current: inspection.current,
      breakpoint: inspection.breakpoint,
      content: {
        availability: "unavailable",
        reason: formatInspectionError(inspection.result.error),
      },
    };
  }

  return {
    addressValue: inspection.address,
    address: formatWebAddress(inspection.address),
    current: inspection.current,
    breakpoint: inspection.breakpoint,
    content: {
      availability: "available",
      opcode: formatOpcode(inspection.result.instruction.instruction.opcode),
      text: inspection.result.instruction.text,
    },
  };
}

function formatRegisterName(index: number): string {
  return `V${index.toString(16).toUpperCase()}`;
}

function formatByte(value: Byte): string {
  return `0x${value.toString(16).toUpperCase().padStart(2, "0")}`;
}

function formatOpcode(value: Opcode): string {
  return value.toString(16).toUpperCase().padStart(4, "0");
}

function formatInspectionError(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
