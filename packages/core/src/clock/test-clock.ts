import type { Clock } from "./clock.ts";
import type { Duration } from "../core/types/duration.ts";
import { type Timestamp, timestamp } from "../core/types/timestamp.ts";

/**
 * Deterministic Clock implementation intended for tests.
 *
 * TestClock does not depend on real time. Its current timestamp advances only
 * when explicitly instructed to do so.
 */
export class TestClock implements Clock {
  private currentTime: Timestamp = timestamp(0n);

  /**
   * {@inheritDoc Clock.now}
   */
  public now(): Timestamp {
    return this.currentTime;
  }

  /**
   * Advances the clock by the specified duration.
   *
   * @param amount - Amount of time to advance.
   *
   * @throws {@link RangeError}
   * Thrown when `amount` is negative.
   */
  public advance(amount: Duration): void {
    if (amount < 0n) {
      throw new RangeError("TestClock cannot be advanced by a negative duration.");
    }

    this.currentTime = timestamp(this.currentTime + amount);
  }
}
