import type { InstructionTrace } from "./instruction-trace.ts";

/** Formats one CPU instruction trace for human-readable presentation. */
export interface InstructionTraceFormatter {
  /**
   * Formats one successful or failed CPU instruction attempt.
   *
   * @param trace - Trace to format.
   * @returns Human-readable trace representation.
   */
  format(trace: InstructionTrace): string;
}
