import type { Key } from "../core/types/key.ts";

/**
 * Provides access to the CHIP-8 hexadecimal keypad.
 *
 * The Keyboard abstraction exposes both the current state of individual keys
 * and the press/release sequence required by instructions that wait for
 * keyboard input.
 *
 * It does not prescribe how input is obtained.
 *
 * Implementations may obtain input from:
 *
 * - a physical keyboard;
 * - terminal input;
 * - HTML keyboard events;
 * - HTML buttons;
 * - automated tests;
 * - another input source.
 */
export interface Keyboard {
  /**
   * Determines whether a key is currently pressed.
   *
   * @param key - CHIP-8 key to query.
   * @returns `true` when the key is currently pressed; otherwise `false`.
   */
  isPressed(key: Key): boolean;

  /**
   * Begins or continues waiting for a key press followed by its release.
   *
   * @remarks
   * This operation is non-blocking. The first call starts a wait operation.
   * It returns `undefined` until a key has been selected and subsequently
   * released.
   *
   * A key that is already pressed when the wait starts may be selected; the
   * wait completes when that key is released.
   *
   * Once a completed key release is returned, the wait operation resets and
   * the next call starts a new wait.
   *
   * @returns The released CHIP-8 key when the wait completes; otherwise
   * `undefined`.
   */
  pollKeyRelease(): Key | undefined;
}
