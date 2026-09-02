import { assertEquals } from "@std/assert";
import { key } from "@chip8nx/core";
import { NoInputKeyboard } from "./no-input-keyboard.ts";

Deno.test("NoInputKeyboard never reports CHIP-8 input", () => {
  const keyboard = new NoInputKeyboard();

  assertEquals(keyboard.isPressed(key(0x0)), false);
  assertEquals(keyboard.isPressed(key(0xf)), false);
  assertEquals(keyboard.pollKeyRelease(), undefined);

  keyboard.reset();

  assertEquals(keyboard.isPressed(key(0x0)), false);
  assertEquals(keyboard.pollKeyRelease(), undefined);
});
