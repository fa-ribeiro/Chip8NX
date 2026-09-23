import type { Address } from "@chip8nx/core";
import { AddressBreakpoints } from "../debugger/address-breakpoints.ts";

interface RuntimeControl {
  readonly isPaused: boolean;

  pause(): void;
  resume(): void;
  step(): void;
  tick(): void;
}

interface ExitStateReader {
  readonly isExited: boolean;
}

interface InputLifecycle {
  start(): void;
  stop(): void;
}

export type WebMachinePauseReason =
  | { readonly kind: "user" }
  | {
    readonly kind: "breakpoint";
    readonly address: Address;
  };

export type WebMachineLifecycleState =
  | { readonly kind: "inactive" }
  | {
    readonly kind: "paused";
    readonly reason: WebMachinePauseReason;
  }
  | { readonly kind: "running" }
  | { readonly kind: "exited" }
  | { readonly kind: "failed"; readonly error: unknown };

/**
 * Coordinates the operational lifecycle of one Web CHIP-8 machine session.
 *
 * @remarks
 * Core owns emulated machine and runtime semantics. This Web-local coordinator
 * owns the host policy that relates runtime scheduling, interpreter exit, input
 * activation, breakpoint pauses, failure recovery, and reset for one browser
 * session.
 *
 * Browser frame scheduling and DOM presentation deliberately remain outside
 * this class.
 */
export class WebMachineLifecycle {
  private currentState: WebMachineLifecycleState = { kind: "inactive" };

  /**
   * Creates an inactive lifecycle around an already-paused runtime and inactive
   * input adapters.
   */
  public constructor(
    private readonly runtime: RuntimeControl,
    private readonly exitState: ExitStateReader,
    private readonly resetMachine: () => void,
    private readonly inputs: readonly InputLifecycle[],
    private readonly breakpoints: AddressBreakpoints,
  ) {
    if (!runtime.isPaused) {
      throw new Error("Web machine lifecycle requires an initially paused runtime.");
    }
  }

  /**
   * Current Web host lifecycle state.
   */
  public get state(): WebMachineLifecycleState {
    return this.currentState;
  }

  /**
   * Makes this session the active browser machine while leaving execution
   * paused.
   */
  public activate(): void {
    if (this.currentState.kind !== "inactive") {
      return;
    }

    if (this.exitState.isExited) {
      this.currentState = { kind: "exited" };

      return;
    }

    try {
      this.startInputs();
      this.currentState = this.userPausedState();
    } catch (error) {
      this.fail(error);
      throw error;
    }
  }

  /**
   * Starts scheduled emulation for an active paused session.
   *
   * @remarks
   * Continuing from a breakpoint suppresses that same address until scheduled
   * execution reaches a different address. Retryable instructions can therefore
   * remain at the stop point for multiple attempts without re-hitting it.
   */
  public start(): WebMachineLifecycleState {
    if (this.currentState.kind !== "paused") {
      return this.currentState;
    }

    if (this.exitState.isExited) {
      this.enterExitedState();

      return this.currentState;
    }

    const previousState = this.currentState;

    if (previousState.reason.kind === "breakpoint") {
      this.breakpoints.suppressWhileAt(previousState.reason.address);
    }

    try {
      this.runtime.resume();
      this.currentState = { kind: "running" };
    } catch (error) {
      this.fail(error);
      throw error;
    }

    return this.currentState;
  }

  /**
   * Pauses scheduled emulation while keeping browser input active.
   */
  public pause(): void {
    if (this.currentState.kind !== "running") {
      return;
    }

    this.runtime.pause();
    this.breakpoints.resetExecutionState();
    this.currentState = this.userPausedState();
  }

  /**
   * Processes one host-observed runtime tick while the session is running.
   */
  public tick(): WebMachineLifecycleState {
    if (this.currentState.kind !== "running") {
      return this.currentState;
    }

    this.execute(() => {
      this.runtime.tick();
    });

    if (this.currentState.kind === "running") {
      const breakpointAddress = this.breakpoints.takeHit();

      if (breakpointAddress !== undefined) {
        this.currentState = {
          kind: "paused",
          reason: {
            kind: "breakpoint",
            address: breakpointAddress,
          },
        };
      }
    }

    return this.currentState;
  }

  /**
   * Executes one instruction while the session is paused.
   *
   * @remarks
   * Manual runtime stepping bypasses the scheduled execution gate, so stepping
   * from a breakpoint executes the stopped instruction directly. A successful
   * step becomes an ordinary user pause rather than retaining the breakpoint
   * pause reason.
   */
  public step(): WebMachineLifecycleState {
    if (this.currentState.kind !== "paused") {
      return this.currentState;
    }

    this.execute(() => {
      this.runtime.step();
    });

    if (this.currentState.kind === "paused") {
      this.breakpoints.resetExecutionState();
      this.currentState = this.userPausedState();
    }

    return this.currentState;
  }

  /**
   * Resets the current session and leaves it active but paused.
   *
   * @remarks
   * Reset is also the recovery path from interpreter exit or execution
   * failure. Input is reactivated in those cases only after the machine reset
   * succeeds. Configured breakpoints are preserved while transient breakpoint
   * execution state is cleared.
   */
  public reset(): void {
    if (this.currentState.kind === "inactive") {
      return;
    }

    const mustRestartInputs = this.currentState.kind === "exited" ||
      this.currentState.kind === "failed";

    this.runtime.pause();

    try {
      this.resetMachine();
      this.breakpoints.resetExecutionState();

      if (mustRestartInputs) {
        this.startInputs();
      }

      this.currentState = this.userPausedState();
    } catch (error) {
      this.fail(error);
      throw error;
    }
  }

  /**
   * Releases this session's host resources and returns it to inactive state.
   */
  public deactivate(): void {
    if (this.currentState.kind === "inactive") {
      return;
    }

    this.runtime.pause();
    this.stopInputs();
    this.breakpoints.resetExecutionState();
    this.currentState = { kind: "inactive" };
  }

  private execute(operation: () => void): void {
    try {
      operation();
    } catch (error) {
      this.fail(error);
      throw error;
    }

    if (this.exitState.isExited) {
      this.enterExitedState();
    }
  }

  private enterExitedState(): void {
    this.runtime.pause();
    this.stopInputs();
    this.breakpoints.resetExecutionState();
    this.currentState = { kind: "exited" };
  }

  private fail(error: unknown): void {
    this.runtime.pause();
    this.stopInputs();
    this.breakpoints.resetExecutionState();
    this.currentState = { kind: "failed", error };
  }

  private userPausedState(): WebMachineLifecycleState {
    return {
      kind: "paused",
      reason: { kind: "user" },
    };
  }

  private startInputs(): void {
    try {
      for (const input of this.inputs) {
        input.start();
      }
    } catch (error) {
      this.stopInputs();
      throw error;
    }
  }

  private stopInputs(): void {
    for (const input of this.inputs) {
      input.stop();
    }
  }
}
