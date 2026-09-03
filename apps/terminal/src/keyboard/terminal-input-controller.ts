/**
 * Interactive terminal-input subsystem exposed to a host application.
 *
 * The controller hides terminal parsing and protocol details while preserving
 * their lower-level components for applications that choose manual
 * composition.
 */
export interface TerminalInputController {
  /** Returns whether the user requested application termination. */
  readonly quitRequested: boolean;

  /**
   * Starts processing terminal input.
   *
   * The returned promise resolves when input processing ends.
   */
  start(): Promise<void>;

  /**
   * Services host-time input behavior such as legacy synthetic releases.
   */
  tick(): void;

  /** Stops input processing and restores terminal input state. */
  stop(): Promise<void>;
}
