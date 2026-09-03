import { assertEquals } from "@std/assert";
import { key, KeyboardState } from "@chip8nx/core";
import type { TerminalKeyEvent, TerminalKeyModifiers } from "./terminal-key-event.ts";
import { TerminalKeyboard } from "./terminal-keyboard.ts";

Deno.test("TerminalKeyboard applies exact CSI-u press and release events", () => {
  const keyboard = new KeyboardState();
  const terminalKeyboard = new TerminalKeyboard(keyboard);

  terminalKeyboard.handleEvent(csiUEvent("q", "press"));

  assertEquals(keyboard.isPressed(key(0x4)), true);

  terminalKeyboard.handleEvent(csiUEvent("q", "repeat"));

  assertEquals(keyboard.isPressed(key(0x4)), true);

  terminalKeyboard.handleEvent(csiUEvent("q", "release"));

  assertEquals(keyboard.isPressed(key(0x4)), false);
});

Deno.test("TerminalKeyboard synthetically releases legacy key presses", () => {
  let now = 0;

  const keyboard = new KeyboardState();
  const terminalKeyboard = new TerminalKeyboard(keyboard, { now: () => now });

  terminalKeyboard.handleEvent(legacyEvent("q"));

  assertEquals(keyboard.isPressed(key(0x4)), true);

  now = 99;
  terminalKeyboard.tick();

  assertEquals(keyboard.isPressed(key(0x4)), true);

  now = 100;
  terminalKeyboard.tick();

  assertEquals(keyboard.isPressed(key(0x4)), false);
});

Deno.test(
  "TerminalKeyboard refreshes the synthetic release deadline on repeated legacy input",
  () => {
    let now = 0;

    const keyboard = new KeyboardState();
    const terminalKeyboard = new TerminalKeyboard(keyboard, { now: () => now });

    terminalKeyboard.handleEvent(legacyEvent("q"));

    now = 90;
    terminalKeyboard.handleEvent(legacyEvent("q"));

    now = 100;
    terminalKeyboard.tick();

    assertEquals(keyboard.isPressed(key(0x4)), true);

    now = 189;
    terminalKeyboard.tick();

    assertEquals(keyboard.isPressed(key(0x4)), true);

    now = 190;
    terminalKeyboard.tick();

    assertEquals(keyboard.isPressed(key(0x4)), false);
  },
);

Deno.test("TerminalKeyboard legacy release completes KeyboardState key-release waits", () => {
  let now = 0;

  const keyboard = new KeyboardState();
  const terminalKeyboard = new TerminalKeyboard(keyboard, { now: () => now });

  assertEquals(keyboard.pollKeyRelease(), undefined);

  terminalKeyboard.handleEvent(legacyEvent("x"));

  assertEquals(keyboard.pollKeyRelease(), undefined);

  now = 100;
  terminalKeyboard.tick();

  assertEquals(keyboard.pollKeyRelease(), key(0x0));
});

Deno.test("TerminalKeyboard tracks legacy keys independently", () => {
  let now = 0;

  const keyboard = new KeyboardState();
  const terminalKeyboard = new TerminalKeyboard(keyboard, { now: () => now });

  terminalKeyboard.handleEvent(legacyEvent("q"));

  now = 50;
  terminalKeyboard.handleEvent(legacyEvent("w"));

  now = 100;
  terminalKeyboard.tick();

  assertEquals(keyboard.isPressed(key(0x4)), false);
  assertEquals(keyboard.isPressed(key(0x5)), true);

  now = 150;
  terminalKeyboard.tick();

  assertEquals(keyboard.isPressed(key(0x5)), false);
});

Deno.test("TerminalKeyboard ignores unmapped characters", () => {
  const keyboard = new KeyboardState();
  const terminalKeyboard = new TerminalKeyboard(keyboard);

  terminalKeyboard.handleEvent(legacyEvent("p"));

  assertEquals(keyboard.isPressed(key(0x4)), false);
});

Deno.test("TerminalKeyboard ignores host control shortcuts", () => {
  const keyboard = new KeyboardState();
  const terminalKeyboard = new TerminalKeyboard(keyboard);

  terminalKeyboard.handleEvent(
    csiUEvent("c", "press", {
      ...noModifiers(),
      ctrl: true,
    }),
  );

  assertEquals(keyboard.isPressed(key(0xb)), false);
});

Deno.test("TerminalKeyboard accepts shifted CHIP-8 mapping keys", () => {
  const keyboard = new KeyboardState();
  const terminalKeyboard = new TerminalKeyboard(keyboard);

  terminalKeyboard.handleEvent(
    csiUEvent("q", "press", {
      ...noModifiers(),
      shift: true,
    }),
  );

  assertEquals(keyboard.isPressed(key(0x4)), true);
});

Deno.test("TerminalKeyboard releaseAll clears exact and synthetic input state", () => {
  let now = 0;

  const keyboard = new KeyboardState();
  const terminalKeyboard = new TerminalKeyboard(keyboard, { now: () => now });

  terminalKeyboard.handleEvent(legacyEvent("q"));
  terminalKeyboard.handleEvent(csiUEvent("w", "press"));

  terminalKeyboard.releaseAll();

  assertEquals(keyboard.isPressed(key(0x4)), false);
  assertEquals(keyboard.isPressed(key(0x5)), false);

  /*
   * Advancing beyond the old synthetic deadline must not recreate or alter
   * input state.
   */
  now = 1_000;
  terminalKeyboard.tick();

  assertEquals(keyboard.isPressed(key(0x4)), false);
});

function legacyEvent(character: string): TerminalKeyEvent {
  return {
    source: "legacy",
    type: "press",
    character,
    modifiers: noModifiers(),
  };
}

function csiUEvent(
  character: string,
  type: TerminalKeyEvent["type"],
  modifiers: TerminalKeyModifiers = noModifiers(),
): TerminalKeyEvent {
  return {
    source: "csi-u",
    type,
    character,
    modifiers,
  };
}

function noModifiers(): TerminalKeyModifiers {
  return {
    shift: false,
    alt: false,
    ctrl: false,
    super: false,
    hyper: false,
    meta: false,
    capsLock: false,
    numLock: false,
  };
}

Deno.test("TerminalKeyboard supports custom CHIP-8 key mappings", () => {
  const keyboard = new KeyboardState();

  const terminalKeyboard = new TerminalKeyboard(keyboard, {
    mapKey: (character) => (character === "p" ? key(0xa) : undefined),
  });

  terminalKeyboard.handleEvent(legacyEvent("p"));

  assertEquals(keyboard.isPressed(key(0xa)), true);
});

Deno.test("TerminalKeyboard supports custom legacy release delays", () => {
  let now = 0;

  const keyboard = new KeyboardState();

  const terminalKeyboard = new TerminalKeyboard(keyboard, {
    legacyReleaseDelayMs: 250,
    now: () => now,
  });

  terminalKeyboard.handleEvent(legacyEvent("q"));

  now = 100;
  terminalKeyboard.tick();

  assertEquals(keyboard.isPressed(key(0x4)), true);

  now = 250;
  terminalKeyboard.tick();

  assertEquals(keyboard.isPressed(key(0x4)), false);
});
