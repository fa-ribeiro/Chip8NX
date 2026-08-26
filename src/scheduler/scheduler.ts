import type { Clock } from "../clock/clock.ts";
import type { Timestamp } from "../core/types/timestamp.ts";
import { Frequency } from "../core/types/frequency.ts";
import { PeriodicTask, type PeriodicTaskCallback } from "./periodic-task.ts";

/**
 * Coordinates execution of periodic tasks according to elapsed time.
 *
 * @remarks
 * Scheduler is deliberately independent of CHIP-8 concepts. It does not
 * know whether a task represents CPU execution, timers, rendering, tracing,
 * or anything else.
 *
 * The Scheduler also does not own an event loop. The host environment calls
 * {@link tick} when appropriate.
 */
export class Scheduler {
  private readonly tasks = new Map<string, PeriodicTask>();

  private previousTimestamp: Timestamp;

  /**
   * Creates a Scheduler.
   *
   * @param clock - Monotonic clock used to measure elapsed time.
   */
  public constructor(
    private readonly clock: Clock,
  ) {
    this.previousTimestamp = clock.now();
  }

  /**
   * Adds a periodic task.
   *
   * @param id - Unique identifier for the task.
   * @param frequency - Task execution frequency.
   * @param callback - Function to execute.
   *
   * @throws {@link Error}
   * Thrown when a task with the same ID already exists.
   */
  public addTask(
    id: string,
    frequency: Frequency,
    callback: PeriodicTaskCallback,
  ): void {
    if (this.tasks.has(id)) {
      throw new Error(`Task already exists: ${id}`);
    }

    this.tasks.set(
      id,
      new PeriodicTask(id, frequency, callback),
    );
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
   * @param id - Identifier of the task.
   *
   * @throws {@link Error}
   * Thrown when the task does not exist.
   */
  public resumeTask(id: string): void {
    this.getTask(id).resume();
  }

  /**
   * Executes all task work that became due since the previous tick.
   *
   * @remarks
   * The Scheduler does not wait for work to become due. It only processes
   * elapsed time that has already passed according to its Clock.
   */
  public tick(): void {
    const currentTimestamp = this.clock.now();
    const elapsed = currentTimestamp - this.previousTimestamp;

    this.previousTimestamp = currentTimestamp;

    for (const task of this.tasks.values()) {
      task.advance(elapsed);
    }
  }

  private getTask(id: string): PeriodicTask {
    const task = this.tasks.get(id);

    if (task === undefined) {
      throw new Error(`Unknown task: ${id}`);
    }

    return task;
  }
}
