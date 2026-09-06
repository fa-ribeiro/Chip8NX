import type { InstructionTrace } from "./instruction-trace.ts";

/**
 * Formats one instruction trace for presentation.
 *
 * @remarks
 * Formatting is independent from both trace observation and output. A
 * formatter returns one logical record and does not append output framing
 * such as a trailing newline.
 */
export interface InstructionTraceFormatter {
  /**
   * Formats one instruction trace.
   *
   * @param trace - Trace record to format.
   * @returns The human-readable trace representation.
   */
  format(trace: InstructionTrace): string;
}
