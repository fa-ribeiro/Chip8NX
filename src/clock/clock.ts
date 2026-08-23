import type { Timestamp } from "../core/types/timestamp.ts";

/**
 * Provides monotonic time to the emulator.
 *
 * Clock is responsible only for answering the question:
 *
 * > What is the current point on the emulator's time source?
 *
 * It does not sleep, schedule work, advance timers, or execute CPU cycles.
 */
export interface Clock {
  /**
   * Returns the current monotonic timestamp.
   *
   * @returns Current timestamp according to this clock.
   */
  now(): Timestamp;
}
