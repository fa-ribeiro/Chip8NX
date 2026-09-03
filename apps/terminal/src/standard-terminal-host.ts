import { type DisplayBuffer, KeyboardState } from "@chip8nx/core";
import { StandardTerminalPresentation } from "./display/standard-terminal-presentation.ts";
import type { TerminalOutput } from "./display/terminal-output.ts";
import type { TerminalPresentation } from "./display/terminal-presentation.ts";
import { StdoutTerminalOutput } from "./display/stdout-terminal-output.ts";
import { StandardTerminalInput } from "./keyboard/standard-terminal-input.ts";
import type { TerminalInputController } from "./keyboard/terminal-input-controller.ts";

/**
 * Creates a terminal presentation subsystem using the host's shared output.
 */
export type TerminalPresentationFactory = (output: TerminalOutput) => TerminalPresentation;

/**
 * Creates a terminal input subsystem using the CHIP-8 keyboard state and the
 * host's shared terminal output.
 */
export type TerminalInputControllerFactory = (
  keyboard: KeyboardState,
  output: TerminalOutput,
) => TerminalInputController;

/**
 * Configures the standard terminal host composition.
 *
 * Level-3 customization happens at subsystem boundaries. Applications that
 * need finer-grained customization can compose the Level-2 or Level-1
 * terminal components directly.
 */
export interface StandardTerminalHostOptions {
  /**
   * Shared terminal output.
   *
   * Defaults to process standard output.
   */
  readonly output?: TerminalOutput;

  /**
   * Creates the presentation subsystem.
   *
   * Defaults to {@link StandardTerminalPresentation}.
   */
  readonly createPresentation?: TerminalPresentationFactory;

  /**
   * Creates the input subsystem.
   *
   * Defaults to {@link StandardTerminalInput}.
   */
  readonly createInput?: TerminalInputControllerFactory;
}

/**
 * Ready-to-use composition of the standard terminal host environment.
 *
 * StandardTerminalHost owns the terminal resource shared by the input and
 * presentation subsystems and assembles their standard Level-2
 * implementations.
 *
 * It does not own CHIP-8 execution, emulated timing, ROM loading, or machine
 * composition.
 *
 * Applications can replace either complete subsystem through the factory
 * options, while lower-level terminal components remain available for fully
 * manual composition.
 */
export class StandardTerminalHost {
  private readonly presentation: TerminalPresentation;
  private readonly input: TerminalInputController;

  public constructor(keyboard: KeyboardState, options: StandardTerminalHostOptions = {}) {
    const output = options.output ?? new StdoutTerminalOutput();

    const createPresentation =
      options.createPresentation ??
      ((output: TerminalOutput) =>
        new StandardTerminalPresentation({
          output,
        }));

    const createInput =
      options.createInput ??
      ((keyboard: KeyboardState, output: TerminalOutput) =>
        new StandardTerminalInput(keyboard, output));

    this.presentation = createPresentation(output);
    this.input = createInput(keyboard, output);
  }

  /** Returns whether the user requested application termination. */
  public get quitRequested(): boolean {
    return this.input.quitRequested;
  }

  /**
   * Starts terminal presentation and input processing.
   *
   * Presentation starts before input so the terminal environment is
   * established before raw keyboard processing begins.
   */
  public start(): Promise<void> {
    this.presentation.start();

    try {
      return this.input.start();
    } catch (error) {
      this.presentation.stop();
      throw error;
    }
  }

  /**
   * Services host-time terminal behavior.
   */
  public tick(): void {
    this.input.tick();
  }

  /**
   * Presents the current CHIP-8 framebuffer.
   */
  public render(buffer: DisplayBuffer): void {
    this.presentation.render(buffer);
  }

  /**
   * Stops terminal input and restores presentation state.
   *
   * Presentation restoration occurs even if input cleanup fails.
   */
  public async stop(): Promise<void> {
    try {
      await this.input.stop();
    } finally {
      this.presentation.stop();
    }
  }
}
