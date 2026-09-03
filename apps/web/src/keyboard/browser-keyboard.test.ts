import { assertEquals } from "@std/assert";
import { key, KeyboardState } from "@chip8nx/core";
import { BrowserKeyboard } from "./browser-keyboard.ts";

Deno.test("BrowserKeyboard forwards browser press and release events", () => {
  const state = new KeyboardState();
  const target = new FakeWindow();

  const keyboard = new BrowserKeyboard(state, target as unknown as Window);

  keyboard.start();

  const down = target.keyDown("KeyQ");

  assertEquals(state.isPressed(key(0x4)), true);

  assertEquals(down.defaultPrevented, true);

  const up = target.keyUp("KeyQ");

  assertEquals(state.isPressed(key(0x4)), false);

  assertEquals(up.defaultPrevented, true);
});

Deno.test("BrowserKeyboard ignores browser key repeat", () => {
  const state = new KeyboardState();
  const target = new FakeWindow();

  const keyboard = new BrowserKeyboard(state, target as unknown as Window);

  keyboard.start();

  target.keyDown("KeyQ", { repeat: true });

  assertEquals(state.isPressed(key(0x4)), false);
});

Deno.test("BrowserKeyboard preserves browser shortcuts", () => {
  const state = new KeyboardState();
  const target = new FakeWindow();

  const keyboard = new BrowserKeyboard(state, target as unknown as Window);

  keyboard.start();

  const event = target.keyDown("KeyQ", { ctrlKey: true });

  assertEquals(state.isPressed(key(0x4)), false);

  assertEquals(event.defaultPrevented, false);
});

Deno.test("BrowserKeyboard releases pressed keys when the window loses focus", () => {
  const state = new KeyboardState();
  const target = new FakeWindow();

  const keyboard = new BrowserKeyboard(state, target as unknown as Window);

  keyboard.start();

  target.keyDown("KeyQ");

  assertEquals(state.isPressed(key(0x4)), true);

  target.blur();

  assertEquals(state.isPressed(key(0x4)), false);
});

Deno.test("BrowserKeyboard stop releases keys and removes listeners", () => {
  const state = new KeyboardState();
  const target = new FakeWindow();

  const keyboard = new BrowserKeyboard(state, target as unknown as Window);

  keyboard.start();

  target.keyDown("KeyQ");

  keyboard.stop();

  assertEquals(state.isPressed(key(0x4)), false);

  target.keyDown("KeyW");

  assertEquals(state.isPressed(key(0x5)), false);
});

interface FakeKeyboardEventOptions {
  readonly repeat?: boolean;
  readonly altKey?: boolean;
  readonly ctrlKey?: boolean;
  readonly metaKey?: boolean;
}

class FakeKeyboardEvent {
  public defaultPrevented = false;

  public readonly repeat: boolean;
  public readonly altKey: boolean;
  public readonly ctrlKey: boolean;
  public readonly metaKey: boolean;

  public constructor(
    public readonly code: string,
    options: FakeKeyboardEventOptions = {},
  ) {
    this.repeat = options.repeat ?? false;
    this.altKey = options.altKey ?? false;
    this.ctrlKey = options.ctrlKey ?? false;
    this.metaKey = options.metaKey ?? false;
  }

  public preventDefault(): void {
    this.defaultPrevented = true;
  }
}

class FakeWindow {
  private readonly keyDownListeners = new Set<(event: KeyboardEvent) => void>();

  private readonly keyUpListeners = new Set<(event: KeyboardEvent) => void>();

  private readonly blurListeners = new Set<() => void>();

  public addEventListener(type: string, listener: EventListenerOrEventListenerObject): void {
    const callback = listener as unknown as (event: KeyboardEvent) => void;

    switch (type) {
      case "keydown":
        this.keyDownListeners.add(callback);
        break;

      case "keyup":
        this.keyUpListeners.add(callback);
        break;

      case "blur":
        this.blurListeners.add(callback as unknown as () => void);
        break;
    }
  }

  public removeEventListener(type: string, listener: EventListenerOrEventListenerObject): void {
    const callback = listener as unknown as (event: KeyboardEvent) => void;

    switch (type) {
      case "keydown":
        this.keyDownListeners.delete(callback);
        break;

      case "keyup":
        this.keyUpListeners.delete(callback);
        break;

      case "blur":
        this.blurListeners.delete(callback as unknown as () => void);
        break;
    }
  }

  public keyDown(code: string, options: FakeKeyboardEventOptions = {}): FakeKeyboardEvent {
    const event = new FakeKeyboardEvent(code, options);

    for (const listener of this.keyDownListeners) {
      listener(event as unknown as KeyboardEvent);
    }

    return event;
  }

  public keyUp(code: string): FakeKeyboardEvent {
    const event = new FakeKeyboardEvent(code);

    for (const listener of this.keyUpListeners) {
      listener(event as unknown as KeyboardEvent);
    }

    return event;
  }

  public blur(): void {
    for (const listener of this.blurListeners) {
      listener();
    }
  }
}
