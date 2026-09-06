import type { Opcode } from "../core/types/opcode.ts";
import type { CpuState } from "../cpu/state/cpu-state.ts";
import type { Instruction } from "../instruction/instruction.ts";

/**
 * Observation of one CPU instruction attempt.
 */
export type InstructionTrace = SuccessfulInstructionTrace | FailedInstructionTrace;

/**
 * Observation of an instruction attempt that returned normally.
 */
export interface SuccessfulInstructionTrace {
  readonly outcome: "success";
  readonly instruction: Instruction;
  readonly before: CpuState;
  readonly after: CpuState;
}

/**
 * Observation of an instruction attempt that failed.
 */
export interface FailedInstructionTrace {
  readonly outcome: "failure";

  /**
   * Opcode assembled before the failure, when available.
   */
  readonly opcode?: Opcode;

  /**
   * Decoded instruction, when decoding completed before the failure.
   */
  readonly instruction?: Instruction;

  readonly before: CpuState;
  readonly after: CpuState;

  /**
   * Original error raised by the CPU attempt.
   */
  readonly error: unknown;
}
