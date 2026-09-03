import { type Key, KeyboardState } from "@chip8nx/core";
import {
  mapTerminalCharacterToChip8Key,
  type TerminalKeyMapping,
} from "./chip8-key-mapping.ts";
import type { TerminalKeyEvent, TerminalKeyModifiers } from "./terminal-key-event.ts";

const DEFAULT_LEGACY_KEY_RELEASE_DELAY_MS = 100;

/**
 * Configures terminal-to-CHIP-8 input adaptation.
 */
export interface TerminalKeyboardOptions {
  /**
   * Maps terminal characters onto CHIP-8 keypad keys.
   *
   * Defaults to the conventional CHIP-8 terminal layout.
   */
  readonly mapKey?: TerminalKeyMapping;

  /**
   * Time after which a legacy terminal key press is synthetically released.
   *
   * Legacy terminals do not report physical key-release events.
   */
  readonly legacyReleaseDelayMs?: number;

  /**
   * Supplies monotonic host time in milliseconds.
   *
   * Primarily useful when manually composing or testing the adapter.
   */
  readonly now?: () => number;
}

/**
 * Adapts semantic terminal key events into CHIP-8 keyboard state.
 *
 * CSI-u events provide explicit press, repeat, and release transitions.
 *
 * Legacy terminal input provides only press-like events, so those keys are
 * released synthetically after a configurable period. Receiving the same
 * legacy key again before its deadline refreshes that deadline.
 *
 * TerminalKeyboard owns host-input policy only. CHIP-8-facing keyboard
 * semantics remain owned by {@link KeyboardState}.
 */
export class TerminalKeyboard {
  private readonly legacyReleaseDeadlines = new Map<Key, number>();

  private readonly mapKey: TerminalKeyMapping;
  private readonly legacyReleaseDelayMs: number;
  private readonly now: () => number;

  public constructor(
    private readonly keyboard: KeyboardState,
    options: TerminalKeyboardOptions = {},
  ) {
    this.mapKey = options.mapKey ?? mapTerminalCharacterToChip8Key;

    this.legacyReleaseDelayMs =
      options.legacyReleaseDelayMs ?? DEFAULT_LEGACY_KEY_RELEASE_DELAY_MS;

    this.now = options.now ?? (() => performance.now());

    if (!Number.isFinite(this.legacyReleaseDelayMs) || this.legacyReleaseDelayMs < 0) {
      throw new RangeError("Legacy key release delay must be a non-negative finite number.");
    }
  }

  /**
   * Applies one decoded terminal key event.
   */
  public handleEvent(event: TerminalKeyEvent): void {
    if (hasControlModifier(event.modifiers)) {
      return;
    }

    const chip8Key = this.mapKey(event.character);

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
   */
  public releaseAll(): void {
    this.legacyReleaseDeadlines.clear();
    this.keyboard.releaseAll();
  }

  private handleLegacyPress(chip8Key: Key): void {
    this.keyboard.press(chip8Key);

    this.legacyReleaseDeadlines.set(chip8Key, this.now() + this.legacyReleaseDelayMs);
  }

  private handleExactEvent(chip8Key: Key, event: TerminalKeyEvent): void {
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
