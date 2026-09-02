import type { Key } from "../core/types/key.ts";
import type { Keyboard } from "./keyboard.ts";

/**
 * In-memory state of the CHIP-8 hexadecimal keypad.
 *
 * KeyboardState translates explicit key press and release events into the
 * {@link Keyboard} behavior consumed by the emulator core.
 *
 * It does not obtain host input itself. Applications can feed it events from
 * terminals, browser keyboard events, game controllers, tests, or any other
 * input source.
 */
export class KeyboardState implements Keyboard {
  private readonly pressedKeys = new Set<Key>();
  private keyReleaseWaitActive = false;
  private latchedKey: Key | undefined;
  private completedKeyRelease: Key | undefined;

  /** {@inheritDoc Keyboard.isPressed} */
  public isPressed(key: Key): boolean {
    return this.pressedKeys.has(key);
  }

  /** {@inheritDoc Keyboard.pollKeyRelease} */
  public pollKeyRelease(): Key | undefined {
    if (this.completedKeyRelease !== undefined) {
      const releasedKey = this.completedKeyRelease;

      this.keyReleaseWaitActive = false;
      this.latchedKey = undefined;
      this.completedKeyRelease = undefined;

      return releasedKey;
    }

    if (!this.keyReleaseWaitActive) {
      this.keyReleaseWaitActive = true;

      const firstPressedKey = this.pressedKeys.values().next().value;

      if (firstPressedKey !== undefined) {
        this.latchedKey = firstPressedKey;
      }
    }

    return undefined;
  }

  /**
   * Marks a CHIP-8 key as currently pressed.
   *
   * Repeated presses of an already-held key are idempotent.
   *
   * @param key - CHIP-8 key whose input state became pressed.
   */
  public press(key: Key): void {
    this.pressedKeys.add(key);

    if (
      this.keyReleaseWaitActive &&
      this.latchedKey === undefined &&
      this.completedKeyRelease === undefined
    ) {
      this.latchedKey = key;
    }
  }

  /**
   * Marks a CHIP-8 key as currently released.
   *
   * Releasing a key that was not pressed has no effect.
   *
   * @param key - CHIP-8 key whose input state became released.
   */
  public release(key: Key): void {
    const wasPressed = this.pressedKeys.delete(key);

    if (wasPressed && this.keyReleaseWaitActive && this.latchedKey === key) {
      this.latchedKey = undefined;
      this.completedKeyRelease = key;
    }
  }

  /**
   * Releases every currently pressed CHIP-8 key.
   *
   * If an active key-release wait has latched one of those keys, releasing all
   * keys completes that wait with the latched key.
   */
  public releaseAll(): void {
    if (
      this.keyReleaseWaitActive &&
      this.latchedKey !== undefined &&
      this.pressedKeys.has(this.latchedKey)
    ) {
      this.completedKeyRelease = this.latchedKey;
      this.latchedKey = undefined;
    }

    this.pressedKeys.clear();
  }

  /** {@inheritDoc Keyboard.reset} */
  public reset(): void {
    this.keyReleaseWaitActive = false;
    this.latchedKey = undefined;
    this.completedKeyRelease = undefined;
  }
}
