import { assertEquals } from "@std/assert";
import { key, KeyboardState } from "@chip8nx/core";
import { KeyboardInputHub } from "./keyboard-input-hub.ts";

Deno.test("KeyboardInputHub forwards one source into KeyboardState", () => {
  const keyboard = new KeyboardState();
  const hub = new KeyboardInputHub(keyboard);

  const source = hub.createSource();

  source.press(key(0x4));

  assertEquals(keyboard.isPressed(key(0x4)), true);

  source.release(key(0x4));

  assertEquals(keyboard.isPressed(key(0x4)), false);
});

Deno.test("KeyboardInputHub keeps a key pressed while another source still holds it", () => {
  const keyboard = new KeyboardState();
  const hub = new KeyboardInputHub(keyboard);

  const physical = hub.createSource();

  const virtual = hub.createSource();

  physical.press(key(0x4));
  virtual.press(key(0x4));

  virtual.release(key(0x4));

  assertEquals(keyboard.isPressed(key(0x4)), true);

  physical.release(key(0x4));

  assertEquals(keyboard.isPressed(key(0x4)), false);
});

Deno.test("KeyboardInputHub releaseAll affects only one input source", () => {
  const keyboard = new KeyboardState();
  const hub = new KeyboardInputHub(keyboard);

  const physical = hub.createSource();

  const virtual = hub.createSource();

  physical.press(key(0x4));
  virtual.press(key(0x4));

  virtual.releaseAll();

  assertEquals(keyboard.isPressed(key(0x4)), true);

  physical.releaseAll();

  assertEquals(keyboard.isPressed(key(0x4)), false);
});
