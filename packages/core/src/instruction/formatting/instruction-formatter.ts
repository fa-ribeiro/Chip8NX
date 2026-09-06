import type { Instruction } from "../instruction.ts";

/**
 * Formats a decoded CHIP-8 instruction for human-readable presentation.
 *
 * Implementations may use different assembly syntaxes or conventions without
 * changing instruction decoding or consumers such as disassembly and tracing.
 */
export interface InstructionFormatter {
  /**
   * Formats a decoded instruction.
   *
   * @param instruction - Instruction to format.
   * @returns The human-readable instruction representation.
   */
  format(instruction: Instruction): string;
}
