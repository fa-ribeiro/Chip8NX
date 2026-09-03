import { type Key, key } from "@chip8nx/core";
import type { KeyboardInput } from "./keyboard-input.ts";

interface KeypadButton {
  readonly element: HTMLButtonElement;
  readonly key: Key;
}

/**
 * Adapts pointer interaction with the on-screen CHIP-8 keypad into CHIP-8
 * key state.
 *
 * Pointer events provide one input model for mouse, touch, and pen devices.
 */
export class VirtualKeypad {
  private readonly buttons: readonly KeypadButton[];

  private readonly activePointers = new Map<number, KeypadButton>();

  private started = false;

  public constructor(
    root: HTMLElement,
    private readonly keyboard: KeyboardInput,
  ) {
    this.buttons = Array.from(
      root.querySelectorAll<HTMLButtonElement>("button[data-chip8-key]"),
      (element) => ({
        element,
        key: parseChip8Key(element),
      }),
    );

    for (const button of this.buttons) {
      this.buttonByElement.set(button.element, button);
    }
  }

  /**
   * Enables the keypad and begins observing pointer input.
   */
  public start(): void {
    if (this.started) {
      return;
    }

    this.started = true;

    for (const button of this.buttons) {
      button.element.disabled = false;

      button.element.addEventListener("pointerdown", this.handlePointerDown);

      button.element.addEventListener("pointerup", this.handlePointerEnd);

      button.element.addEventListener("pointercancel", this.handlePointerEnd);

      button.element.addEventListener("lostpointercapture", this.handlePointerEnd);
    }
  }

  /**
   * Stops pointer input and releases every key held by this keypad.
   */
  public stop(): void {
    if (!this.started) {
      return;
    }

    this.started = false;

    for (const button of this.buttons) {
      button.element.removeEventListener("pointerdown", this.handlePointerDown);

      button.element.removeEventListener("pointerup", this.handlePointerEnd);

      button.element.removeEventListener("pointercancel", this.handlePointerEnd);

      button.element.removeEventListener("lostpointercapture", this.handlePointerEnd);

      button.element.disabled = true;

      delete button.element.dataset.pressed;
    }

    this.activePointers.clear();

    /*
     * This KeyboardInput belongs exclusively to the virtual keypad, so
     * releaseAll() does not release keys still held by other input sources.
     */
    this.keyboard.releaseAll();
  }

  private readonly buttonByElement = new WeakMap<HTMLButtonElement, KeypadButton>();

  private readonly handlePointerDown = (event: PointerEvent): void => {
    if (event.button !== 0) {
      return;
    }

    const button = this.findButton(event.currentTarget);

    if (button === undefined || this.activePointers.has(event.pointerId)) {
      return;
    }

    event.preventDefault();

    const alreadyPressed = this.isKeyActive(button.key);

    this.activePointers.set(event.pointerId, button);

    button.element.dataset.pressed = "true";

    button.element.setPointerCapture(event.pointerId);

    if (!alreadyPressed) {
      this.keyboard.press(button.key);
    }
  };

  private readonly handlePointerEnd = (event: PointerEvent): void => {
    const button = this.activePointers.get(event.pointerId);

    if (button === undefined) {
      return;
    }

    event.preventDefault();

    this.activePointers.delete(event.pointerId);

    if (this.isKeyActive(button.key)) {
      return;
    }

    delete button.element.dataset.pressed;

    this.keyboard.release(button.key);
  };

  private findButton(target: EventTarget | null): KeypadButton | undefined {
    if (!(target instanceof HTMLButtonElement)) {
      return undefined;
    }

    return this.buttonByElement.get(target);
  }

  private isKeyActive(key: Key): boolean {
    for (const active of this.activePointers.values()) {
      if (active.key === key) {
        return true;
      }
    }

    return false;
  }
}

function parseChip8Key(element: HTMLButtonElement): Key {
  const value = element.dataset.chip8Key;

  if (value === undefined || !/^[0-9A-F]$/u.test(value)) {
    throw new Error("Virtual keypad button has an invalid CHIP-8 key.");
  }

  return key(Number.parseInt(value, 16));
}
