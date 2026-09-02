import { assertEquals } from "@std/assert";

import { key } from "../core/types/key.ts";
import { KeyboardState } from "./keyboard-state.ts";

Deno.test("KeyboardState initially has no pressed keys", () => {
  const keyboard = new KeyboardState();

  assertEquals(keyboard.isPressed(key(0x0)), false);
  assertEquals(keyboard.isPressed(key(0xf)), false);
});

Deno.test("KeyboardState reports a pressed key", () => {
  const keyboard = new KeyboardState();
  const testKey = key(0xa);

  keyboard.press(testKey);

  assertEquals(keyboard.isPressed(testKey), true);
});

Deno.test("KeyboardState reports a released key", () => {
  const keyboard = new KeyboardState();
  const testKey = key(0xa);

  keyboard.press(testKey);
  keyboard.release(testKey);

  assertEquals(keyboard.isPressed(testKey), false);
});

Deno.test("KeyboardState keeps different keys independent", () => {
  const keyboard = new KeyboardState();

  keyboard.press(key(0x1));
  keyboard.press(key(0x2));

  assertEquals(keyboard.isPressed(key(0x1)), true);
  assertEquals(keyboard.isPressed(key(0x2)), true);
  assertEquals(keyboard.isPressed(key(0x3)), false);
});

Deno.test("KeyboardState release only affects the specified key", () => {
  const keyboard = new KeyboardState();

  keyboard.press(key(0x1));
  keyboard.press(key(0x2));

  keyboard.release(key(0x1));

  assertEquals(keyboard.isPressed(key(0x1)), false);
  assertEquals(keyboard.isPressed(key(0x2)), true);
});

Deno.test("KeyboardState releaseAll releases every key", () => {
  const keyboard = new KeyboardState();

  keyboard.press(key(0x1));
  keyboard.press(key(0x5));
  keyboard.press(key(0xf));

  keyboard.releaseAll();

  assertEquals(keyboard.isPressed(key(0x1)), false);
  assertEquals(keyboard.isPressed(key(0x5)), false);
  assertEquals(keyboard.isPressed(key(0xf)), false);
});

Deno.test("KeyboardState key-release wait remains pending when no key is pressed", () => {
  const keyboard = new KeyboardState();

  assertEquals(keyboard.pollKeyRelease(), undefined);
  assertEquals(keyboard.pollKeyRelease(), undefined);
});

Deno.test("KeyboardState reports a key after it is pressed and released", () => {
  const keyboard = new KeyboardState();
  const testKey = key(0xa);

  assertEquals(keyboard.pollKeyRelease(), undefined);

  keyboard.press(testKey);
  keyboard.release(testKey);

  assertEquals(keyboard.pollKeyRelease(), testKey);
});

Deno.test("KeyboardState waits for release when a key is already pressed", () => {
  const keyboard = new KeyboardState();
  const testKey = key(0xb);

  keyboard.press(testKey);

  assertEquals(keyboard.pollKeyRelease(), undefined);

  keyboard.release(testKey);

  assertEquals(keyboard.pollKeyRelease(), testKey);
});

Deno.test("KeyboardState releaseAll while keyReleaseWaitActive", () => {
  const keyboard = new KeyboardState();
  const testKey = key(0xc);

  keyboard.press(testKey);

  assertEquals(keyboard.pollKeyRelease(), undefined);

  keyboard.releaseAll();

  assertEquals(keyboard.pollKeyRelease(), testKey);
  assertEquals(keyboard.pollKeyRelease(), undefined);
});

Deno.test(
  "KeyboardState reset cancels an active key-release wait while preserving pressed keys",
  () => {
    const keyboard = new KeyboardState();
    const testKey = key(0xb);

    keyboard.press(testKey);

    assertEquals(keyboard.pollKeyRelease(), undefined);

    keyboard.reset();

    assertEquals(keyboard.isPressed(testKey), true);

    keyboard.release(testKey);

    assertEquals(keyboard.pollKeyRelease(), undefined);
  },
);

Deno.test("KeyboardState reset discards a completed key release", () => {
  const keyboard = new KeyboardState();
  const testKey = key(0xc);

  assertEquals(keyboard.pollKeyRelease(), undefined);

  keyboard.press(testKey);
  keyboard.release(testKey);

  keyboard.reset();

  assertEquals(keyboard.pollKeyRelease(), undefined);
});

Deno.test("KeyboardState repeated presses are idempotent", () => {
  const keyboard = new KeyboardState();
  const testKey = key(0xa);

  keyboard.press(testKey);
  keyboard.press(testKey);

  assertEquals(keyboard.isPressed(testKey), true);

  keyboard.release(testKey);

  assertEquals(keyboard.isPressed(testKey), false);
});
