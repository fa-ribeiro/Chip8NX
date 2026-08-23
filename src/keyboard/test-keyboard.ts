import type { Key } from "../core/types/key.ts";
import type { Keyboard } from "./keyboard.ts";

/**
 * Deterministic in-memory Keyboard implementation intended for tests.
 *
 * TestKeyboard allows tests to explicitly control the state of individual
 * CHIP-8 keys without depending on operating-system or UI input.
 */
export class TestKeyboard implements Keyboard {
  private readonly pressedKeys = new Set<Key>();

  /**
   * {@inheritDoc Keyboard.isPressed}
   */
  public isPressed(key: Key): boolean {
    return this.pressedKeys.has(key);
  }

  /**
   * Marks a key as pressed.
   *
   * This method is intentionally specific to the test implementation and
   * is not part of the {@link Keyboard} interface.
   */
  public press(key: Key): void {
    this.pressedKeys.add(key);
  }

  /**
   * Marks a key as released.
   *
   * This method is intentionally specific to the test implementation and
   * is not part of the {@link Keyboard} interface.
   */
  public release(key: Key): void {
    this.pressedKeys.delete(key);
  }

  /**
   * Releases all currently pressed keys.
   */
  public releaseAll(): void {
    this.pressedKeys.clear();
  }
}
