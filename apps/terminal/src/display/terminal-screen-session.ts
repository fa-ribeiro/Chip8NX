import type { TerminalOutput } from "./terminal-output.ts";

const ENTER_ALTERNATE_SCREEN = "\x1b[?1049h";
const LEAVE_ALTERNATE_SCREEN = "\x1b[?1049l";

const HIDE_CURSOR = "\x1b[?25l";
const SHOW_CURSOR = "\x1b[?25h";

/**
 * Owns terminal presentation lifecycle that applies to the application as a
 * whole rather than to an individual rendered CHIP-8 frame.
 *
 * The session uses the terminal's alternate screen and hides the text cursor
 * while the emulator is running. Stopping the session restores the cursor and
 * the user's original terminal contents.
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

    this.output.write(ENTER_ALTERNATE_SCREEN + HIDE_CURSOR);
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
     * Restore cursor visibility before leaving the alternate screen so even a
     * terminal with imperfect alternate-screen handling is not left with a
     * hidden cursor.
     */
    this.output.write(SHOW_CURSOR + LEAVE_ALTERNATE_SCREEN);
  }
}
