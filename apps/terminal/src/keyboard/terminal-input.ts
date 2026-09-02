/**
 * Provides raw terminal input to the terminal application.
 *
 * This boundary keeps terminal lifecycle code testable without manipulating
 * the process stdin stream directly.
 */
export interface TerminalInput {
  readonly readable: ReadableStream<Uint8Array>;

  /** Returns whether the input is attached to an interactive terminal. */
  isTerminal(): boolean;

  /** Enables or disables terminal raw mode. */
  setRaw(enabled: boolean): void;
}
