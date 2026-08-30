import type { Key } from "../core/types/key.ts";
import type { Keyboard } from "./keyboard.ts";

/**
 * Deterministic in-memory Keyboard implementation intended for tests.
 *
 * TestKeyboard allows tests to explicitly control the state and transitions
 * of individual CHIP-8 keys without depending on operating-system or UI
 * input.
 */
export class TestKeyboard implements Keyboard {
  private readonly pressedKeys = new Set<Key>();

  private keyReleaseWaitActive = false;
  private latchedKey: Key | undefined;
  private completedKeyRelease: Key | undefined;

  /**
   * {@inheritDoc Keyboard.isPressed}
   */
  public isPressed(key: Key): boolean {
    return this.pressedKeys.has(key);
  }

  /**
   * {@inheritDoc Keyboard.pollKeyRelease}
   */
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
   * Marks a key as pressed.
   *
   * This method is intentionally specific to the test implementation and
   * is not part of the {@link Keyboard} interface.
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
   * Marks a key as released.
   *
   * This method is intentionally specific to the test implementation and
   * is not part of the {@link Keyboard} interface.
   */
  public release(key: Key): void {
    const wasPressed = this.pressedKeys.delete(key);

    if (wasPressed && this.keyReleaseWaitActive && this.latchedKey === key) {
      this.latchedKey = undefined;
      this.completedKeyRelease = key;
    }
  }

  /**
   * Releases all currently pressed keys.
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
}
