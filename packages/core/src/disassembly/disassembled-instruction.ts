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
  readonly address: Address;
  readonly instruction: Instruction;
  readonly text: string;
}
