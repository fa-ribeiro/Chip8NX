import type { Display, DisplayBuffer } from "@chip8nx/core";
import type { TerminalPresentation } from "./terminal-presentation.ts";
import { StdoutTerminalOutput } from "./stdout-terminal-output.ts";
import { TerminalDisplay } from "./terminal-display.ts";
import type { TerminalDisplayFactory } from "./terminal-display-factory.ts";
import type { TerminalOutput } from "./terminal-output.ts";
import { TerminalScreenSession } from "./terminal-screen-session.ts";

/**
 * Configuration for the standard terminal presentation composition.
 *
 * Defaults provide the normal Chip8NX terminal output and renderer.
 *
 * Applications that need a different output destination or framebuffer
 * renderer can override those meaningful subsystem boundaries without
 * manually assembling the rest of the terminal presentation stack.
 */
export interface StandardTerminalPresentationOptions {
  readonly output?: TerminalOutput;
  readonly createDisplay?: TerminalDisplayFactory;
}

/**
 * Ready-to-use composition of the standard terminal display subsystem.
 *
 * The composition combines:
 *
 * - terminal output;
 * - framebuffer rendering;
 * - alternate-screen lifecycle;
 * - cursor lifecycle.
 *
 * Each underlying component remains available independently for applications
 * that need full manual composition.
 */
export class StandardTerminalPresentation implements TerminalPresentation {
  private readonly display: Display;
  private readonly screenSession: TerminalScreenSession;

  public constructor(options: StandardTerminalPresentationOptions = {}) {
    const output = options.output ?? new StdoutTerminalOutput();

    const createDisplay =
      options.createDisplay ?? ((output: TerminalOutput) => new TerminalDisplay(output));

    this.display = createDisplay(output);
    this.screenSession = new TerminalScreenSession(output);
  }

  /** Enters the standard terminal presentation environment. */
  public start(): void {
    this.screenSession.start();
  }

  /** Presents the current CHIP-8 framebuffer. */
  public render(buffer: DisplayBuffer): void {
    this.display.render(buffer);
  }

  /** Restores the terminal presentation environment. */
  public stop(): void {
    this.screenSession.stop();
  }
}
