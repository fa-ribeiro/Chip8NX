import type { Address } from "../core/types/address.ts";
import type { Instruction } from "../instruction/instruction.ts";

/**
 * Represents one successfully decoded instruction at a specific memory address.
 *
 * The decoded {@link Instruction} retains the original opcode and semantic
 * instruction data, while `text` contains the human-readable representation
 * selected by the configured instruction formatter.
 */
export interface DisassembledInstruction {
  /**
   * Memory address of the instruction's first byte.
   */
  readonly address: Address;

  /**
   * Typed instruction produced by opcode decoding.
   */
  readonly instruction: Instruction;

  /**
   * Human-readable representation produced by the configured formatter.
   */
  readonly text: string;
}
