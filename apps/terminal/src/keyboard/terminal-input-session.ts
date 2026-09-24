import type { TerminalOutput } from "../display/terminal-output.ts";
import type { TerminalInput } from "./terminal-input.ts";
import { TerminalKeyEventParser } from "./terminal-key-event-parser.ts";
import type { TerminalKeyEvent } from "./terminal-key-event.ts";
import type { TerminalKeyboard } from "./terminal-keyboard.ts";

const ENABLE_ENHANCED_KEYBOARD = "\x1b[>10u";
const RESTORE_KEYBOARD = "\x1b[<u";

/**
 * Owns the lifecycle of interactive terminal keyboard input.
 *
 * When attached to a TTY, the session:
 *
 * 1. enters raw mode;
 * 2. requests Kitty keyboard event-type and all-key reporting;
 * 3. reads and parses terminal input;
 * 4. forwards CHIP-8 input to TerminalKeyboard;
 * 5. recognizes Escape and Ctrl+C as application quit commands;
 * 6. restores terminal keyboard mode and raw mode during cleanup.
 *
 * Terminals that do not support the Kitty keyboard protocol simply continue
 * producing legacy input, which TerminalKeyboard handles through its
 * synthetic-release fallback.
 */
export class TerminalInputSession {
  private reader: ReadableStreamDefaultReader<Uint8Array> | undefined;
  private started = false;

  public quitRequested = false;

  public constructor(
    private readonly input: TerminalInput,
    private readonly output: TerminalOutput,
    private readonly parser: TerminalKeyEventParser,
    private readonly keyboard: TerminalKeyboard,
  ) {}

  /**
   * Starts reading terminal input.
   *
   * The returned promise resolves when input ends or the user requests exit.
   * It rejects when reading stdin fails.
   */
  public async start(): Promise<void> {
    if (this.started || !this.input.isTerminal()) {
      return;
    }

    this.started = true;

    try {
      this.input.setRaw(true);
      this.output.write(ENABLE_ENHANCED_KEYBOARD);

      this.reader = this.input.readable.getReader();

      await this.readLoop();
    } catch (error) {
      try {
        /*
         * readLoop has already stopped when it rejects, so releasing the
         * reader is sufficient here. Calling cancel() on an errored stream
         * would only re-surface the same read failure during cleanup.
         */
        await this.cleanup(false);
      } catch (cleanupError) {
        throw new AggregateError(
          [error, cleanupError],
          "Terminal input failed and terminal-state restoration also failed",
        );
      }

      throw error;
    }
  }

  /**
   * Restores terminal state and releases all CHIP-8 keys.
   *
   * Cleanup is idempotent so callers can safely use it from a `finally`
   * block.
   */
  public stop(): Promise<void> {
    return this.cleanup(true);
  }

  private async cleanup(cancelReader: boolean): Promise<void> {
    if (!this.started) {
      return;
    }

    this.started = false;

    const errors: unknown[] = [];

    try {
      this.keyboard.releaseAll();
    } catch (error) {
      errors.push(error);
    }

    const reader = this.reader;
    this.reader = undefined;

    if (reader !== undefined) {
      if (cancelReader) {
        try {
          await reader.cancel();
        } catch (error) {
          errors.push(error);
        }
      }

      try {
        reader.releaseLock();
      } catch (error) {
        errors.push(error);
      }
    }

    try {
      this.output.write(RESTORE_KEYBOARD);
    } catch (error) {
      errors.push(error);
    }

    try {
      this.input.setRaw(false);
    } catch (error) {
      errors.push(error);
    }

    throwCleanupErrors(errors, "Failed to fully restore terminal input state");
  }

  private async readLoop(): Promise<void> {
    const reader = this.reader;

    if (reader === undefined) {
      return;
    }

    try {
      while (!this.quitRequested) {
        const { value, done } = await reader.read();

        if (done) {
          return;
        }

        if (value === undefined) {
          continue;
        }

        for (const event of this.parser.feed(value)) {
          if (isQuitEvent(event)) {
            this.quitRequested = true;
            return;
          }

          this.keyboard.handleEvent(event);
        }
      }
    } catch (error) {
      this.quitRequested = true;
      throw error;
    }
  }
}

const ESCAPE = "\x1b";

function isQuitEvent(event: TerminalKeyEvent): boolean {
  /*
   * Enhanced keyboard reporting represents Escape as an explicit key event,
   * avoiding ambiguity with the ESC prefix used by terminal control
   * sequences.
   */
  if (event.source === "csi-u" && event.type === "press" && event.character === ESCAPE) {
    return true;
  }

  /*
   * In legacy raw mode Ctrl+C is the single control byte ETX (0x03).
   */
  if (event.source === "legacy" && event.character === "\x03") {
    return true;
  }

  /*
   * With enhanced keyboard reporting Ctrl+C arrives as an explicit
   * Ctrl-modified CSI-u event.
   */
  return (
    event.source === "csi-u" &&
    event.type === "press" &&
    event.character.toLowerCase() === "c" &&
    event.modifiers.ctrl
  );
}

function throwCleanupErrors(errors: readonly unknown[], message: string): void {
  if (errors.length === 0) {
    return;
  }

  if (errors.length === 1) {
    throw errors[0];
  }

  throw new AggregateError(errors, message);
}
