import type { CpuState } from "../cpu/state/cpu-state.ts";
import type { Instruction } from "../instruction/instruction.ts";

/**
 * Immutable observation of one CHIP-8 instruction attempt that returned normally.
 *
 * @remarks
 * `before` and `after` are CPU-state snapshots taken immediately before the
 * fetch-decode-execute attempt and immediately after execution returns.
 *
 * The snapshots describe CPU state only. They do not include complete machine
 * state such as memory, display pixels, keyboard state, vertical blank, or RNG
 * provider state.
 */
export interface InstructionTrace {
  /** Decoded instruction attempted by this CPU cycle. */
  readonly instruction: Instruction;

  /** CPU state immediately before the instruction attempt. */
  readonly before: CpuState;

  /** CPU state immediately after execution returns normally. */
  readonly after: CpuState;
}
