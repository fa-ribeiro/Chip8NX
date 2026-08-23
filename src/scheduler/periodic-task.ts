import type { Frequency } from "../core/types/frequency.ts";

/**
 * Callback executed when a periodic task becomes due.
 */
export type PeriodicTaskCallback = () => void;

/**
 * A task that executes a callback at a configured frequency.
 *
 * @remarks
 * A PeriodicTask owns the scheduling state associated with one callback,
 * including its accumulated fractional time and suspension state.
 *
 * The Scheduler is responsible for providing elapsed time. The task is
 * responsible for determining whether that elapsed time makes one or more
 * executions due.
 */
export class PeriodicTask {
  private static readonly NANOS_PER_SECOND = 1_000_000_000n;

  private accumulatedTicks = 0n;
  private suspended = false;

  /**
   * Creates a periodic task.
   *
   * @param id - Unique identifier for the task within a Scheduler.
   * @param frequency - Number of executions per second.
   * @param callback - Function executed once for each due execution.
   */
  public constructor(
    public readonly id: string,
    private readonly frequency: Frequency,
    private readonly callback: PeriodicTaskCallback,
  ) {}

  /**
   * Gets whether this task is currently suspended.
   */
  public get isSuspended(): boolean {
    return this.suspended;
  }

  /**
   * Suspends the task.
   *
   * @remarks
   * Elapsed time while suspended is deliberately discarded. This prevents
   * a paused emulator from accumulating thousands of executions that would
   * otherwise run immediately when the task resumes.
   */
  public suspend(): void {
    this.suspended = true;
    this.accumulatedTicks = 0n;
  }

  /**
   * Resumes the task.
   *
   * @remarks
   * The task starts accumulating elapsed time from the next scheduler tick.
   */
  public resume(): void {
    this.suspended = false;
    this.accumulatedTicks = 0n;
  }

  /**
   * Advances the task by the specified amount of elapsed time.
   *
   * @param elapsedNanoseconds - Elapsed time since the previous scheduler tick.
   */
  public advance(elapsedNanoseconds: bigint): void {
    if (this.suspended) {
      return;
    }

    this.accumulatedTicks += elapsedNanoseconds * this.frequency.numerator;

    const threshold = PeriodicTask.NANOS_PER_SECOND * this.frequency.denominator;

    while (this.accumulatedTicks >= threshold) {
      this.accumulatedTicks -= threshold;
      this.callback();
    }
  }
}
