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

export type WebMachineLifecycleState =
  | { readonly kind: "inactive" }
  | { readonly kind: "paused" }
  | { readonly kind: "running" }
  | { readonly kind: "exited" }
  | { readonly kind: "failed"; readonly error: unknown };

/**
 * Coordinates the operational lifecycle of one Web CHIP-8 machine session.
 *
 * @remarks
 * Core owns emulated machine and runtime semantics. This Web-local coordinator
 * owns the host policy that relates runtime scheduling, interpreter exit, input
 * activation, failure recovery, and reset for one browser session.
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
      this.currentState = { kind: "paused" };
    } catch (error) {
      this.fail(error);
      throw error;
    }
  }

  /**
   * Starts scheduled emulation for an active paused session.
   */
  public start(): WebMachineLifecycleState {
    if (this.currentState.kind !== "paused") {
      return this.currentState;
    }

    if (this.exitState.isExited) {
      this.enterExitedState();

      return this.currentState;
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
    this.currentState = { kind: "paused" };
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

    return this.currentState;
  }

  /**
   * Executes one instruction while the session is paused.
   */
  public step(): WebMachineLifecycleState {
    if (this.currentState.kind !== "paused") {
      return this.currentState;
    }

    this.execute(() => {
      this.runtime.step();
    });

    return this.currentState;
  }

  /**
   * Resets the current session and leaves it active but paused.
   *
   * @remarks
   * Reset is also the recovery path from interpreter exit or execution
   * failure. Input is reactivated in those cases only after the machine reset
   * succeeds.
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

      if (mustRestartInputs) {
        this.startInputs();
      }

      this.currentState = { kind: "paused" };
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
    this.currentState = { kind: "exited" };
  }

  private fail(error: unknown): void {
    this.runtime.pause();
    this.stopInputs();
    this.currentState = { kind: "failed", error };
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
