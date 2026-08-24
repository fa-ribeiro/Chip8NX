import type { Clock } from "./clock.ts";
import type { Timestamp } from "../core/types/timestamp.ts";

/**
 * Clock implementation backed by the platform's monotonic Performance API.
 *
 * @remarks
 * `performance.now()` is expressed in milliseconds, while the emulator's
 * Clock contract uses integer nanoseconds. The conversion happens here so
 * platform-specific timing units never leak into the emulator core.
 */
export class PerformanceClock implements Clock {
  /**
   * {@inheritDoc Clock.now}
   */
  public now(): Timestamp {
    return BigInt(Math.floor(performance.now() * 1_000_000)) as Timestamp;
  }
}
