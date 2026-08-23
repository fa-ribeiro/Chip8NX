import type { Duration } from "../core/types/duration.ts";
import type { Timestamp } from "../core/types/timestamp.ts";
import type { Clock } from "./clock.ts";

/**
 * Deterministic Clock implementation intended for tests.
 *
 * TestClock does not depend on real time. Its current timestamp advances only
 * when explicitly instructed to do so.
 */
export class TestClock implements Clock {
  private currentTime: Timestamp = 0n as Timestamp;

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
      throw new RangeError(
        "TestClock cannot be advanced by a negative duration.",
      );
    }

    this.currentTime = (this.currentTime + amount) as Timestamp;
  }
}
