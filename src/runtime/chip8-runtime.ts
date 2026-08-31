import type { Frequency } from "../core/types/frequency.ts";
import type { Cpu } from "../cpu/cpu.ts";
import type { Scheduler } from "../scheduler/scheduler.ts";
import type { Timer } from "../timer/timer.ts";
import type { Chip8RuntimeConfiguration } from "./chip8-runtime-configuration.ts";

/**
 * Orchestrates execution of an already-assembled CHIP-8 machine over time.
 *
 * @remarks
 * Chip8Runtime coordinates CPU execution and timer countdown through a
 * Scheduler. It does not initialize the machine, perform external I/O,
 * render the display, produce audio, or own the host event loop.
 *
 * A runtime starts paused. The application must explicitly call
 * {@link resume} before scheduled execution begins.
 */
export class Chip8Runtime {
  private static nextInstanceId = 0;

  private readonly cpuTaskId: string;
  private readonly timerTaskId: string;

  private paused = true;

  /**
   * Creates a CHIP-8 runtime.
   *
   * @param cpu - CPU whose instructions are scheduled for execution.
   * @param delayTimer - CHIP-8 delay timer.
   * @param soundTimer - CHIP-8 sound timer.
   * @param scheduler - Scheduler used to coordinate emulated time.
   * @param configuration - Runtime execution-policy configuration.
   * @param timerFrequency - Frequency at which both CHIP-8 timers tick.
   */
  public constructor(
    private readonly cpu: Cpu,
    private readonly delayTimer: Timer,
    private readonly soundTimer: Timer,
    private readonly scheduler: Scheduler,
    configuration: Chip8RuntimeConfiguration,
    timerFrequency: Frequency,
  ) {
    const instanceId = Chip8Runtime.nextInstanceId++;

    this.cpuTaskId = `chip8-runtime:${instanceId}:cpu`;
    this.timerTaskId = `chip8-runtime:${instanceId}:timers`;

    /*
     * Register timers first so an exact timer/CPU deadline tie processes the
     * timer boundary before executing the instruction at that same instant.
     */
    this.scheduler.addTask(this.timerTaskId, timerFrequency, () => {
      this.delayTimer.tick();
      this.soundTimer.tick();
    });

    this.scheduler.addTask(this.cpuTaskId, configuration.cpuFrequency, () => {
      this.cpu.step();
    });

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
   * Calling tick while paused is safe. The runtime's CPU and timer tasks are
   * suspended, so they perform no work.
   */
  public tick(): void {
    this.scheduler.tick();
  }

  /**
   * Pauses scheduled CPU execution and timer countdown.
   *
   * @remarks
   * Pausing is idempotent. Scheduling progress for both tasks is discarded
   * according to Scheduler suspension semantics.
   */
  public pause(): void {
    if (this.paused) {
      return;
    }

    this.scheduler.suspendTask(this.timerTaskId);
    this.scheduler.suspendTask(this.cpuTaskId);

    this.paused = true;
  }

  /**
   * Resumes scheduled CPU execution and timer countdown.
   *
   * @remarks
   * Resuming is idempotent. Each task schedules its next occurrence one full
   * period after the current scheduler time.
   */
  public resume(): void {
    if (!this.paused) {
      return;
    }

    this.scheduler.resumeTask(this.timerTaskId);
    this.scheduler.resumeTask(this.cpuTaskId);

    this.paused = false;
  }

  /**
   * Executes exactly one CHIP-8 instruction while scheduled execution is
   * paused.
   *
   * @remarks
   * Single stepping does not advance either CHIP-8 timer.
   *
   * @throws {Error}
   * If the runtime is currently running.
   */
  public step(): void {
    if (!this.paused) {
      throw new Error("Cannot step while runtime is running.");
    }

    this.cpu.step();
  }
}
