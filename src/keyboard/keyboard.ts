import type { Key } from "../core/types/key.ts";

/**
 * Provides access to the state of the CHIP-8 hexadecimal keypad.
 *
 * The Keyboard abstraction deliberately describes only what the emulator
 * needs to know: whether a particular CHIP-8 key is currently pressed.
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
}
