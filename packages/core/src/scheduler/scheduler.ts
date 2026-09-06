import type { Clock } from "../clock/clock.ts";
import type { Frequency } from "../core/types/frequency.ts";
import type { Timestamp } from "../core/types/timestamp.ts";

/**
 * Coordinates periodic callbacks according to a monotonic clock.
 *
 * @remarks
 * Scheduler owns the global scheduling timeline. Each periodic task has an
 * exact rational deadline, and due callbacks are executed in chronological
 * order across all registered tasks.
 *
 * Tasks whose deadlines are exactly equal execute in stable registration
 * order.
 *
 * Scheduler is deliberately independent of CHIP-8 concepts. It does not know
 * whether a task represents CPU execution, timers, rendering, tracing, or
 * anything else.
 *
 * Scheduler also does not own an event loop. The host environment calls
 * {@link tick} when appropriate.
 */
export class Scheduler {
  private readonly tasks = new Map<string, ScheduledTask>();

  /**
   * Creates a Scheduler.
   *
   * @param clock - Monotonic clock used to determine the current time.
   */
  public constructor(private readonly clock: Clock) {}

  /**
   * Adds a periodic task.
   *
   * @remarks
   * The first execution is scheduled one complete period after the task is
   * registered.
   *
   * @param id - Unique identifier for the task.
   * @param frequency - Task execution frequency.
   * @param callback - Function executed when the task becomes due.
   *
   * @throws {@link Error}
   * Thrown when a task with the same ID already exists.
   */
  public addTask(id: string, frequency: Frequency, callback: () => void): void {
    if (this.tasks.has(id)) {
      throw new Error(`Task already exists: ${id}`);
    }

    this.tasks.set(id, new ScheduledTask(frequency, callback, this.clock.now()));
  }

  /**
   * Removes a periodic task.
   *
   * @param id - Identifier of the task to remove.
   *
   * @returns `true` when a task was removed, otherwise `false`.
   */
  public removeTask(id: string): boolean {
    return this.tasks.delete(id);
  }

  /**
   * Suspends a periodic task.
   *
   * @remarks
   * Suspension discards the task's current scheduling progress. When resumed,
   * its next execution is scheduled one complete period after the resume time.
   *
   * @param id - Identifier of the task.
   *
   * @throws {@link Error}
   * Thrown when the task does not exist.
   */
  public suspendTask(id: string): void {
    this.getTask(id).suspend();
  }

  /**
   * Resumes a previously suspended periodic task.
   *
   * @remarks
   * Time elapsed while suspended is discarded. Resuming schedules the next
   * execution one complete period after the current clock time.
   *
   * Resuming a task that is already active has no effect.
   *
   * @param id - Identifier of the task.
   *
   * @throws {@link Error}
   * Thrown when the task does not exist.
   */
  public resumeTask(id: string): void {
    this.getTask(id).resume(this.clock.now());
  }

  /**
   * Executes every task occurrence whose deadline is at or before the current
   * clock time.
   *
   * @remarks
   * Due occurrences are selected globally by deadline, so catch-up work from
   * tasks with different frequencies remains chronologically ordered.
   *
   * The current clock time is sampled once per tick. Time spent executing
   * callbacks is therefore handled by a subsequent tick rather than extending
   * the current scheduling horizon.
   */
  public tick(): void {
    const currentTimestamp = this.clock.now();

    while (true) {
      const task = this.findEarliestDueTask(currentTimestamp);

      if (task === undefined) {
        return;
      }

      task.execute();
    }
  }

  /**
   * Finds the registered task with the earliest deadline that is currently due.
   *
   * @remarks
   * Map iteration preserves registration order. Therefore, when deadlines are
   * exactly equal, retaining the first task encountered provides deterministic
   * tie-breaking without a separate priority mechanism.
   */
  private findEarliestDueTask(currentTimestamp: Timestamp): ScheduledTask | undefined {
    let earliestTask: ScheduledTask | undefined;

    for (const task of this.tasks.values()) {
      if (!task.isDueAt(currentTimestamp)) {
        continue;
      }

      if (earliestTask === undefined || task.hasEarlierDeadlineThan(earliestTask)) {
        earliestTask = task;
      }
    }

    return earliestTask;
  }

  private getTask(id: string): ScheduledTask {
    const task = this.tasks.get(id);

    if (task === undefined) {
      throw new Error(`Unknown task: ${id}`);
    }

    return task;
  }
}

/**
 * Scheduling state for one periodic callback.
 *
 * @remarks
 * ScheduledTask does not choose which task executes next. It only maintains
 * the exact deadline sequence for one periodic callback. Global temporal
 * ordering belongs exclusively to {@link Scheduler}.
 *
 * Deadlines are represented as exact rational nanosecond values:
 *
 *     deadlineNumerator / deadlineDenominator
 *
 * This avoids floating-point arithmetic and cumulative period rounding.
 */
class ScheduledTask {
  private static readonly NANOS_PER_SECOND = 1_000_000_000n;

  /**
   * Exact period numerator in nanoseconds.
   *
   * For frequency `p / q`, the period is:
   *
   *     NANOS_PER_SECOND * q
   *     --------------------
   *              p
   */
  private readonly periodNumerator: bigint;

  /**
   * Denominator shared by every deadline belonging to this task.
   */
  private readonly deadlineDenominator: bigint;

  /**
   * Numerator of this task's next exact deadline.
   */
  private nextDeadlineNumerator: bigint;

  private suspended = false;

  public constructor(
    frequency: Frequency,
    private readonly callback: () => void,
    startTimestamp: Timestamp,
  ) {
    this.periodNumerator = ScheduledTask.NANOS_PER_SECOND * frequency.denominator;

    this.deadlineDenominator = frequency.numerator;

    this.nextDeadlineNumerator = startTimestamp * this.deadlineDenominator +
      this.periodNumerator;
  }

  /**
   * Returns whether the next exact deadline is at or before the supplied
   * integer-nanosecond timestamp.
   */
  public isDueAt(currentTimestamp: Timestamp): boolean {
    if (this.suspended) {
      return false;
    }

    return this.nextDeadlineNumerator <= currentTimestamp * this.deadlineDenominator;
  }

  /**
   * Compares this task's exact next deadline with another task's deadline.
   *
   * @remarks
   * Cross multiplication lets us compare rational values without division or
   * floating-point conversion.
   */
  public hasEarlierDeadlineThan(other: ScheduledTask): boolean {
    return (
      this.nextDeadlineNumerator * other.deadlineDenominator <
        other.nextDeadlineNumerator * this.deadlineDenominator
    );
  }

  /**
   * Consumes one scheduled occurrence and executes its callback.
   *
   * @remarks
   * The deadline advances before the callback runs. Therefore, if the callback
   * throws, that occurrence is still considered consumed and will not execute
   * again on the next Scheduler tick.
   */
  public execute(): void {
    this.nextDeadlineNumerator += this.periodNumerator;
    this.callback();
  }

  /**
   * Suspends this task.
   */
  public suspend(): void {
    this.suspended = true;
  }

  /**
   * Resumes this task from the supplied timestamp.
   *
   * @remarks
   * Resumption deliberately discards the previous deadline and schedules a new
   * occurrence one complete period after the resume time.
   */
  public resume(currentTimestamp: Timestamp): void {
    if (!this.suspended) {
      return;
    }

    this.suspended = false;

    this.nextDeadlineNumerator = currentTimestamp * this.deadlineDenominator +
      this.periodNumerator;
  }
}
