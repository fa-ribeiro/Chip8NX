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
 * 5. recognizes Ctrl+C as the application quit command;
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
  public start(): Promise<void> {
    if (this.started || !this.input.isTerminal()) {
      return Promise.resolve();
    }

    this.started = true;

    this.input.setRaw(true);
    this.output.write(ENABLE_ENHANCED_KEYBOARD);

    this.reader = this.input.readable.getReader();

    return this.readLoop();
  }

  /**
   * Restores terminal state and releases all CHIP-8 keys.
   *
   * Cleanup is idempotent so callers can safely use it from a `finally`
   * block.
   */
  public async stop(): Promise<void> {
    if (!this.started) {
      return;
    }

    this.started = false;

    this.keyboard.releaseAll();

    const reader = this.reader;
    this.reader = undefined;

    if (reader !== undefined) {
      await reader.cancel();
      reader.releaseLock();
    }

    this.output.write(RESTORE_KEYBOARD);
    this.input.setRaw(false);
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

function isQuitEvent(event: TerminalKeyEvent): boolean {
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
