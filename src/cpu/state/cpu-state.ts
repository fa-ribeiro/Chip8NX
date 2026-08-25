import type { Address } from "../../core/types/address.ts";
import type { Byte } from "../../core/types/byte.ts";

/**
 * Represents an immutable snapshot of the CHIP-8 CPU state.
 *
 * @remarks
 * A `CpuState` describes the state of the CPU at a particular point in
 * execution. It is intended for consumers such as debuggers, tracers,
 * tests, and user interfaces.
 *
 * The state contains copies of mutable collections such as the register
 * bank and stack. Consequently, changing the CPU after a snapshot has been
 * created cannot modify that snapshot.
 */
export interface CpuState {
  /**
   * Values of the sixteen general-purpose registers, V0 through VF.
   *
   * The array index corresponds to the register number:
   *
   * - index `0` = V0
   * - index `1` = V1
   * - ...
   * - index `15` = VF
   */
  readonly registers: readonly Byte[];

  /**
   * Current value of the index register I.
   */
  readonly index: Address;

  /**
   * Address of the next instruction to execute.
   */
  readonly programCounter: Address;

  /**
   * Contents of the call stack.
   *
   * @remarks
   * Entries are ordered from bottom to top. The last entry is therefore
   * the current top of the stack.
   */
  readonly stack: readonly Address[];

  /**
   * Current delay timer value.
   */
  readonly delayTimer: Byte;

  /**
   * Current sound timer value.
   */
  readonly soundTimer: Byte;
}
