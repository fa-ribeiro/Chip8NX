import type { Display } from "@chip8nx/core";

/**
 * Terminal presentation subsystem.
 *
 * Extends the Core display contract with lifecycle operations required by
 * terminal presentation environments.
 */
export interface TerminalPresentation extends Display {
  /** Enters the terminal presentation environment. */
  start(): void;

  /** Restores the terminal presentation environment. */
  stop(): void;
}
