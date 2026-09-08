import type { InstructionTrace } from "./instruction-trace.ts";

/**
 * Observes CPU instruction attempts.
 *
 * @remarks
 * Observers may receive successful or failed instruction attempts.
 *
 * Observation is purely diagnostic. Errors raised while observing a trace
 * must not alter CPU execution behavior or replace an execution failure.
 */
export interface InstructionTraceObserver {
  /**
   * Observes one CPU instruction attempt.
   *
   * @param trace - Successful or failed instruction trace.
   */
  observe(trace: InstructionTrace): void;
}
