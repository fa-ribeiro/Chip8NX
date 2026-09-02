import type { Key, Keyboard } from "@chip8nx/core";

/**
 * Keyboard implementation for terminal sessions that do not provide input.
 *
 * No CHIP-8 key is ever considered pressed, and key-release waits never
 * complete.
 *
 * This adapter exists only for the initial read-only terminal application.
 * It should not be interpreted as the eventual terminal keyboard design.
 */
export class NoInputKeyboard implements Keyboard {
  /**
   * Always reports that the requested CHIP-8 key is not pressed.
   */
  public isPressed(_key: Key): boolean {
    return false;
  }

  /**
   * Never produces a completed key-release sequence.
   */
  public pollKeyRelease(): Key | undefined {
    return undefined;
  }

  /**
   * There is no transient input state to reset.
   */
  public reset(): void {}
}
