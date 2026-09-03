import type { TerminalOutput } from "./terminal-output.ts";

const ENTER_ALTERNATE_SCREEN = "\x1b[?1049h";
const LEAVE_ALTERNATE_SCREEN = "\x1b[?1049l";

const HIDE_CURSOR = "\x1b[?25l";
const SHOW_CURSOR = "\x1b[?25h";

const GREEN_FOREGROUND = "\x1b[32m";
const RESET_ATTRIBUTES = "\x1b[0m";

/**
 * Owns terminal presentation state that applies to the application as a whole.
 *
 * The standard presentation uses an alternate screen, hides the cursor, and
 * applies a retro green foreground while active.
 *
 * Individual renderers remain responsible only for presenting frames.
 */
export class TerminalScreenSession {
  private started = false;

  public constructor(private readonly output: TerminalOutput) {}

  /**
   * Enters the application presentation mode.
   *
   * Starting an already-started session has no effect.
   */
  public start(): void {
    if (this.started) {
      return;
    }

    this.started = true;

    this.output.write(ENTER_ALTERNATE_SCREEN + HIDE_CURSOR + GREEN_FOREGROUND);
  }

  /**
   * Restores the terminal presentation state.
   *
   * Stopping an inactive session has no effect.
   */
  public stop(): void {
    if (!this.started) {
      return;
    }

    this.started = false;

    /*
     * Reset presentation attributes and restore cursor visibility before
     * leaving the alternate screen so even a terminal with imperfect
     * alternate-screen handling is not left with modified terminal state.
     */
    this.output.write(RESET_ATTRIBUTES + SHOW_CURSOR + LEAVE_ALTERNATE_SCREEN);
  }
}
