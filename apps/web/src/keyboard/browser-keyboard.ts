import type { KeyboardInput } from "./keyboard-input.ts";
import { mapBrowserCodeToChip8Key } from "./browser-key-mapping.ts";

/**
 * Adapts browser keyboard events into CHIP-8 keyboard state.
 *
 * Browsers provide explicit keydown and keyup events, so unlike legacy
 * terminal input no synthetic key-release behavior is required.
 */
export class BrowserKeyboard {
  private started = false;

  public constructor(
    private readonly keyboard: KeyboardInput,
    private readonly target: Window = window,
  ) {}

  /**
   * Starts observing browser keyboard events.
   *
   * Starting an already-active adapter has no effect.
   */
  public start(): void {
    if (this.started) {
      return;
    }

    this.started = true;

    this.target.addEventListener("keydown", this.handleKeyDown);

    this.target.addEventListener("keyup", this.handleKeyUp);

    /*
     * Browsers may not deliver keyup when the window loses focus.
     *
     * Releasing all CHIP-8 keys prevents a physical key from remaining stuck
     * after switching tabs, changing windows, or opening browser UI.
     */
    this.target.addEventListener("blur", this.handleBlur);
  }

  /**
   * Stops observing browser input and releases any currently pressed keys.
   */
  public stop(): void {
    if (!this.started) {
      return;
    }

    this.started = false;

    this.target.removeEventListener("keydown", this.handleKeyDown);

    this.target.removeEventListener("keyup", this.handleKeyUp);

    this.target.removeEventListener("blur", this.handleBlur);

    this.keyboard.releaseAll();
  }

  private readonly handleKeyDown = (event: KeyboardEvent): void => {
    /*
     * Host controls own keyboard input while they are focused. In particular,
     * typing a breakpoint address must not also press CHIP-8 keypad keys.
     */
    if (isHostControlTarget(event.target)) {
      return;
    }

    /*
     * Preserve browser/system shortcuts such as Ctrl+R, Cmd+Q, and Alt-based
     * navigation rather than interpreting them as CHIP-8 input.
     */
    if (event.altKey || event.ctrlKey || event.metaKey) {
      return;
    }

    /*
     * KeyboardState needs logical press/release transitions, not the browser's
     * auto-repeat stream while a physical key remains held.
     */
    if (event.repeat) {
      return;
    }

    const chip8Key = mapBrowserCodeToChip8Key(event.code);

    if (chip8Key === undefined) {
      return;
    }

    event.preventDefault();

    this.keyboard.press(chip8Key);
  };

  private readonly handleKeyUp = (event: KeyboardEvent): void => {
    const chip8Key = mapBrowserCodeToChip8Key(event.code);

    if (chip8Key === undefined) {
      return;
    }

    /*
     * Always process release for a mapped key, even if focus moved into a host
     * control while the physical key was held. Otherwise the CHIP-8 key could
     * remain stuck. Avoid cancelling the host control's own keyup event.
     */
    if (!isHostControlTarget(event.target)) {
      event.preventDefault();
    }

    this.keyboard.release(chip8Key);
  };

  private readonly handleBlur = (): void => {
    this.keyboard.releaseAll();
  };
}

/**
 * Returns whether a keyboard event originated from a host UI control that
 * should retain ordinary browser keyboard behavior.
 */
function isHostControlTarget(target: EventTarget | null): boolean {
  if (target === null || typeof target !== "object") {
    return false;
  }

  if ("isContentEditable" in target && target.isContentEditable === true) {
    return true;
  }

  if (!("tagName" in target) || typeof target.tagName !== "string") {
    return false;
  }

  switch (target.tagName.toUpperCase()) {
    case "INPUT":
    case "TEXTAREA":
    case "SELECT":
    case "BUTTON":
      return true;

    default:
      return false;
  }
}
