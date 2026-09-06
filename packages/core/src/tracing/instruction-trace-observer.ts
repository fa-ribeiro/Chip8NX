import type { InstructionTrace } from "./instruction-trace.ts";

/**
 * Observes CHIP-8 instruction traces without participating in execution.
 *
 * @remarks
 * Observers are notified only after an instruction attempt returns normally.
 * The CPU isolates exceptions thrown by an observer so tracing cannot turn an
 * otherwise successful instruction attempt into an emulation failure.
 */
export interface InstructionTraceObserver {
  /** Receives one immutable instruction trace. */
  observe(trace: InstructionTrace): void;
}
