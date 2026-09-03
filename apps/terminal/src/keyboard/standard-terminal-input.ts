import { KeyboardState } from "@chip8nx/core";
import type { TerminalOutput } from "../display/terminal-output.ts";
import type { TerminalKeyMapping } from "./chip8-key-mapping.ts";
import { StdinTerminalInput } from "./stdin-terminal-input.ts";
import type { TerminalInput } from "./terminal-input.ts";
import { TerminalInputSession } from "./terminal-input-session.ts";
import { TerminalKeyEventParser } from "./terminal-key-event-parser.ts";
import { TerminalKeyboard } from "./terminal-keyboard.ts";
import type { TerminalInputController } from "./terminal-input-controller.ts";
/**
 * Configuration for the standard terminal input composition.
 *
 * The options expose meaningful input-level customization without requiring
 * applications to manually assemble parser, keyboard adapter, and terminal
 * session infrastructure.
 */
export interface StandardTerminalInputOptions {
  /**
   * Terminal input source.
   *
   * Defaults to process standard input.
   */
  readonly input?: TerminalInput;

  /**
   * Maps terminal characters onto CHIP-8 keypad keys.
   *
   * Defaults to the conventional CHIP-8 terminal layout.
   */
  readonly mapKey?: TerminalKeyMapping;

  /**
   * Synthetic release delay used when the terminal cannot report real
   * key-release events.
   */
  readonly legacyReleaseDelayMs?: number;
}

/**
 * Ready-to-use composition of the standard terminal keyboard subsystem.
 *
 * The composition combines:
 *
 * - process terminal input;
 * - raw-input lifecycle;
 * - enhanced keyboard protocol negotiation;
 * - terminal key-event parsing;
 * - conventional CHIP-8 key mapping;
 * - legacy synthetic-release behavior.
 *
 * The underlying components remain independently available for applications
 * requiring complete manual composition.
 */
export class StandardTerminalInput implements TerminalInputController {
  private readonly terminalKeyboard: TerminalKeyboard;
  private readonly inputSession: TerminalInputSession;

  public constructor(
    keyboard: KeyboardState,
    output: TerminalOutput,
    options: StandardTerminalInputOptions = {},
  ) {
    this.terminalKeyboard = new TerminalKeyboard(keyboard, {
      mapKey: options.mapKey,
      legacyReleaseDelayMs: options.legacyReleaseDelayMs,
    });

    this.inputSession = new TerminalInputSession(
      options.input ?? new StdinTerminalInput(),
      output,
      new TerminalKeyEventParser(),
      this.terminalKeyboard,
    );
  }

  /**
   * Returns whether the user has requested application termination.
   */
  public get quitRequested(): boolean {
    return this.inputSession.quitRequested;
  }

  /**
   * Starts interactive terminal input processing.
   */
  public start(): Promise<void> {
    return this.inputSession.start();
  }

  /**
   * Services host-time input behavior such as synthetic legacy releases.
   */
  public tick(): void {
    this.terminalKeyboard.tick();
  }

  /**
   * Stops input processing and restores terminal input state.
   */
  public stop(): Promise<void> {
    return this.inputSession.stop();
  }
}
