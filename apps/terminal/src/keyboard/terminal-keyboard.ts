import { type Key, KeyboardState } from "@chip8nx/core";
import { mapTerminalCharacterToChip8Key } from "./chip8-key-mapping.ts";
import type { TerminalKeyEvent, TerminalKeyModifiers } from "./terminal-key-event.ts";

const LEGACY_KEY_RELEASE_DELAY_MS = 100;

/**
 * Adapts semantic terminal key events into CHIP-8 keyboard state.
 *
 * CSI-u events provide explicit press, repeat, and release transitions.
 *
 * Legacy terminal input provides only press-like events, so those keys are
 * released synthetically after a short period. Receiving the same legacy key
 * again before its deadline refreshes that deadline.
 *
 * TerminalKeyboard owns host-input policy only. The CHIP-8-facing keyboard
 * semantics, including FX0A press/release tracking, remain owned by
 * {@link KeyboardState}.
 */
export class TerminalKeyboard {
  private readonly legacyReleaseDeadlines = new Map<Key, number>();

  public constructor(
    private readonly keyboard: KeyboardState,
    private readonly now: () => number = () => performance.now(),
  ) {}

  /**
   * Applies one decoded terminal key event.
   *
   * Terminal characters outside the CHIP-8 mapping are ignored. Control-like
   * modifiers are also ignored so host shortcuts such as Ctrl+C do not become
   * CHIP-8 key presses.
   */
  public handleEvent(event: TerminalKeyEvent): void {
    if (hasControlModifier(event.modifiers)) {
      return;
    }

    const chip8Key = mapTerminalCharacterToChip8Key(event.character);

    if (chip8Key === undefined) {
      return;
    }

    if (event.source === "legacy") {
      this.handleLegacyPress(chip8Key);
      return;
    }

    this.handleExactEvent(chip8Key, event);
  }

  /**
   * Applies synthetic releases whose legacy-input deadlines have expired.
   *
   * Applications should call this regularly from their host loop.
   */
  public tick(): void {
    const currentTime = this.now();

    for (const [chip8Key, deadline] of this.legacyReleaseDeadlines) {
      if (currentTime < deadline) {
        continue;
      }

      this.keyboard.release(chip8Key);
      this.legacyReleaseDeadlines.delete(chip8Key);
    }
  }

  /**
   * Releases all input and discards pending synthetic-release deadlines.
   *
   * This is intended for host-input shutdown and cleanup.
   */
  public releaseAll(): void {
    this.legacyReleaseDeadlines.clear();
    this.keyboard.releaseAll();
  }

  private handleLegacyPress(chip8Key: Key): void {
    this.keyboard.press(chip8Key);

    this.legacyReleaseDeadlines.set(chip8Key, this.now() + LEGACY_KEY_RELEASE_DELAY_MS);
  }

  private handleExactEvent(chip8Key: Key, event: TerminalKeyEvent): void {
    /*
     * An exact CSI-u event supersedes any synthetic legacy deadline that may
     * previously have existed for this key.
     */
    this.legacyReleaseDeadlines.delete(chip8Key);

    switch (event.type) {
      case "press":
      case "repeat":
        this.keyboard.press(chip8Key);
        return;

      case "release":
        this.keyboard.release(chip8Key);
        return;
    }
  }
}

function hasControlModifier(modifiers: TerminalKeyModifiers): boolean {
  return (
    modifiers.alt || modifiers.ctrl || modifiers.super || modifiers.hyper || modifiers.meta
  );
}
