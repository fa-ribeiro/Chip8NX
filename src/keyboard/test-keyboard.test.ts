import { assertEquals } from "@std/assert";

import { key } from "../core/types/key.ts";
import { TestKeyboard } from "./test-keyboard.ts";

Deno.test("TestKeyboard initially has no pressed keys", () => {
  const keyboard = new TestKeyboard();

  assertEquals(keyboard.isPressed(key(0x0)), false);
  assertEquals(keyboard.isPressed(key(0xf)), false);
});

Deno.test("TestKeyboard reports a pressed key", () => {
  const keyboard = new TestKeyboard();
  const testKey = key(0xa);

  keyboard.press(testKey);

  assertEquals(keyboard.isPressed(testKey), true);
});

Deno.test("TestKeyboard reports a released key", () => {
  const keyboard = new TestKeyboard();
  const testKey = key(0xa);

  keyboard.press(testKey);
  keyboard.release(testKey);

  assertEquals(keyboard.isPressed(testKey), false);
});

Deno.test("TestKeyboard keeps different keys independent", () => {
  const keyboard = new TestKeyboard();

  keyboard.press(key(0x1));
  keyboard.press(key(0x2));

  assertEquals(keyboard.isPressed(key(0x1)), true);
  assertEquals(keyboard.isPressed(key(0x2)), true);
  assertEquals(keyboard.isPressed(key(0x3)), false);
});

Deno.test("TestKeyboard release only affects the specified key", () => {
  const keyboard = new TestKeyboard();

  keyboard.press(key(0x1));
  keyboard.press(key(0x2));

  keyboard.release(key(0x1));

  assertEquals(keyboard.isPressed(key(0x1)), false);
  assertEquals(keyboard.isPressed(key(0x2)), true);
});

Deno.test("TestKeyboard releaseAll releases every key", () => {
  const keyboard = new TestKeyboard();

  keyboard.press(key(0x1));
  keyboard.press(key(0x5));
  keyboard.press(key(0xf));

  keyboard.releaseAll();

  assertEquals(keyboard.isPressed(key(0x1)), false);
  assertEquals(keyboard.isPressed(key(0x5)), false);
  assertEquals(keyboard.isPressed(key(0xf)), false);
});
