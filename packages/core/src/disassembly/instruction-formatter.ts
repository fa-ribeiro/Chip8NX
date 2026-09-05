import type { Instruction } from "../instruction/instruction.ts";

/**
 * Formats a decoded CHIP-8 instruction for human-readable presentation.
 *
 * Implementations may use different assembly syntaxes or conventions without
 * changing instruction decoding or disassembly.
 */
export interface InstructionFormatter {
  format(instruction: Instruction): string;
}
