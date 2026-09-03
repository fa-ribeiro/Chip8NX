import { type Key, KeyboardState } from "@chip8nx/core";
import type { KeyboardInput } from "./keyboard-input.ts";

/**
 * Combines multiple browser input sources into one CHIP-8 keyboard state.
 *
 * A CHIP-8 key remains pressed while at least one registered source continues
 * to hold it.
 */
export class KeyboardInputHub {
  private readonly pressCounts = new Map<Key, number>();

  public constructor(private readonly keyboard: KeyboardState) {}

  /**
   * Creates an independent input channel.
   */
  public createSource(): KeyboardInput {
    return new KeyboardInputSource(this);
  }

  /** @internal */
  public pressFromSource(key: Key): void {
    const count = this.pressCounts.get(key) ?? 0;

    this.pressCounts.set(key, count + 1);

    if (count === 0) {
      this.keyboard.press(key);
    }
  }

  /** @internal */
  public releaseFromSource(key: Key): void {
    const count = this.pressCounts.get(key);

    if (count === undefined) {
      return;
    }

    if (count > 1) {
      this.pressCounts.set(key, count - 1);

      return;
    }

    this.pressCounts.delete(key);
    this.keyboard.release(key);
  }
}

class KeyboardInputSource implements KeyboardInput {
  private readonly pressed = new Set<Key>();

  public constructor(private readonly hub: KeyboardInputHub) {}

  public press(key: Key): void {
    if (this.pressed.has(key)) {
      return;
    }

    this.pressed.add(key);

    this.hub.pressFromSource(key);
  }

  public release(key: Key): void {
    if (!this.pressed.delete(key)) {
      return;
    }

    this.hub.releaseFromSource(key);
  }

  public releaseAll(): void {
    for (const key of this.pressed) {
      this.hub.releaseFromSource(key);
    }

    this.pressed.clear();
  }
}
