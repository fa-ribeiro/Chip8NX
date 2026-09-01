import type { Frequency } from "../core/types/frequency.ts";
import type { Cpu } from "../cpu/cpu.ts";
import type { VerticalBlank } from "../display/vertical-blank.ts";
import type { Scheduler } from "../scheduler/scheduler.ts";
import type { Timer } from "../timer/timer.ts";
import type { Chip8RuntimeConfiguration } from "./chip8-runtime-configuration.ts";

/**
 * Orchestrates execution of an already-assembled CHIP-8 machine over time.
 *
 * @remarks
 * Chip8Runtime coordinates CPU execution, timer countdown, and emulated
 * display-frame boundaries through a Scheduler. It does not initialize the
 * machine, perform external I/O, render the display, produce audio, or own
 * the host event loop.
 *
 * A runtime starts paused. The application must explicitly call
 * {@link resume} before scheduled execution begins.
 */
export class Chip8Runtime {
  private static nextInstanceId = 0;

  private readonly verticalBlankTaskId: string;
  private readonly timerTaskId: string;
  private readonly cpuTaskId: string;

  private paused = true;

  /**
   * Creates a CHIP-8 runtime.
   *
   * @param cpu - CPU whose instructions are scheduled for execution.
   * @param delayTimer - CHIP-8 delay timer.
   * @param soundTimer - CHIP-8 sound timer.
   * @param verticalBlank - Emulated vertical-blank synchronization state.
   * @param scheduler - Scheduler used to coordinate emulated time.
   * @param configuration - Runtime execution-policy configuration.
   * @param timerFrequency - Frequency at which both CHIP-8 timers tick.
   * @param displayRefreshFrequency - Frequency of emulated display-frame boundaries.
   */
  public constructor(
    private readonly cpu: Cpu,
    private readonly delayTimer: Timer,
    private readonly soundTimer: Timer,
    private readonly verticalBlank: VerticalBlank,
    private readonly scheduler: Scheduler,
    configuration: Chip8RuntimeConfiguration,
    timerFrequency: Frequency,
    displayRefreshFrequency: Frequency,
  ) {
    const instanceId = Chip8Runtime.nextInstanceId++;

    this.verticalBlankTaskId = `chip8-runtime:${instanceId}:vertical-blank`;
    this.timerTaskId = `chip8-runtime:${instanceId}:timers`;
    this.cpuTaskId = `chip8-runtime:${instanceId}:cpu`;

    /*
     * Register vertical blank first so an exact display/CPU deadline tie makes
     * the new display interval available before the CPU executes a draw
     * instruction at that same instant.
     *
     * Timers remain before CPU so an exact timer/CPU deadline tie processes the
     * timer boundary before executing the instruction at that same instant.
     */
    this.scheduler.addTask(this.verticalBlankTaskId, displayRefreshFrequency, () => {
      this.verticalBlank.signal();
    });

    this.scheduler.addTask(this.timerTaskId, timerFrequency, () => {
      this.delayTimer.tick();
      this.soundTimer.tick();
    });

    this.scheduler.addTask(this.cpuTaskId, configuration.cpuFrequency, () => {
      this.cpu.step();
    });

    this.scheduler.suspendTask(this.verticalBlankTaskId);
    this.scheduler.suspendTask(this.timerTaskId);
    this.scheduler.suspendTask(this.cpuTaskId);
  }

  /**
   * Returns whether scheduled CHIP-8 execution is currently paused.
   */
  public get isPaused(): boolean {
    return this.paused;
  }

  /**
   * Processes all scheduled work due at the scheduler's current time.
   *
   * @remarks
   * Calling tick while paused is safe. The runtime's vertical-blank, timer,
   * and CPU tasks are suspended, so they perform no work.
   */
  public tick(): void {
    this.scheduler.tick();
  }

  /**
   * Pauses scheduled CPU execution, timer countdown, and display-frame
   * scheduling.
   *
   * @remarks
   * Pausing is idempotent. Scheduling progress for all runtime tasks is
   * discarded according to Scheduler suspension semantics.
   */
  public pause(): void {
    if (this.paused) {
      return;
    }

    this.scheduler.suspendTask(this.verticalBlankTaskId);
    this.scheduler.suspendTask(this.timerTaskId);
    this.scheduler.suspendTask(this.cpuTaskId);

    this.paused = true;
  }

  /**
   * Resumes scheduled CPU execution, timer countdown, and display-frame
   * scheduling.
   *
   * @remarks
   * Resuming is idempotent. Each task schedules its next occurrence one full
   * period after the current scheduler time.
   */
  public resume(): void {
    if (!this.paused) {
      return;
    }

    this.scheduler.resumeTask(this.verticalBlankTaskId);
    this.scheduler.resumeTask(this.timerTaskId);
    this.scheduler.resumeTask(this.cpuTaskId);

    this.paused = false;
  }

  /**
   * Executes exactly one CHIP-8 instruction while scheduled execution is
   * paused.
   *
   * @remarks
   * Single stepping does not advance CHIP-8 timers or scheduled emulated time.
   *
   * If no vertical-blank opportunity is already pending, the runtime supplies
   * one temporary opportunity so a display-synchronized draw instruction can
   * complete during debugging.
   *
   * A temporary opportunity that is not consumed by the stepped instruction is
   * discarded afterward. A vertical blank that was already pending before the
   * step is preserved unless the instruction consumes it.
   *
   * @throws {Error}
   * If the runtime is currently running.
   */
  public step(): void {
    if (!this.paused) {
      throw new Error("Cannot step while runtime is running.");
    }

    const hadPendingVerticalBlank = this.verticalBlank.isPending;

    if (!hadPendingVerticalBlank) {
      this.verticalBlank.signal();
    }

    try {
      this.cpu.step();
    } finally {
      if (!hadPendingVerticalBlank && this.verticalBlank.isPending) {
        this.verticalBlank.reset();
      }
    }
  }
}
