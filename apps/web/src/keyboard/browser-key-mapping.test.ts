import { assertEquals } from "@std/assert";
import { key } from "@chip8nx/core";
import { mapBrowserCodeToChip8Key } from "./browser-key-mapping.ts";

Deno.test("maps conventional browser keyboard positions to CHIP-8 keys", () => {
  const cases = [
    ["Digit1", 0x1],
    ["Digit2", 0x2],
    ["Digit3", 0x3],
    ["Digit4", 0xc],

    ["KeyQ", 0x4],
    ["KeyW", 0x5],
    ["KeyE", 0x6],
    ["KeyR", 0xd],

    ["KeyA", 0x7],
    ["KeyS", 0x8],
    ["KeyD", 0x9],
    ["KeyF", 0xe],

    ["KeyZ", 0xa],
    ["KeyX", 0x0],
    ["KeyC", 0xb],
    ["KeyV", 0xf],
  ] as const;

  for (const [code, chip8Key] of cases) {
    assertEquals(mapBrowserCodeToChip8Key(code), key(chip8Key));
  }
});

Deno.test("ignores browser keys outside the CHIP-8 mapping", () => {
  assertEquals(mapBrowserCodeToChip8Key("Escape"), undefined);

  assertEquals(mapBrowserCodeToChip8Key("Space"), undefined);
});
