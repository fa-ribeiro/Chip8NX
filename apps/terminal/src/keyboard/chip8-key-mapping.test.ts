import { assertEquals } from "@std/assert";
import { key } from "@chip8nx/core";
import { mapTerminalCharacterToChip8Key } from "./chip8-key-mapping.ts";

Deno.test("maps the conventional terminal layout to CHIP-8 keys", () => {
  const mappings = [
    ["1", 0x1],
    ["2", 0x2],
    ["3", 0x3],
    ["4", 0xc],

    ["q", 0x4],
    ["w", 0x5],
    ["e", 0x6],
    ["r", 0xd],

    ["a", 0x7],
    ["s", 0x8],
    ["d", 0x9],
    ["f", 0xe],

    ["z", 0xa],
    ["x", 0x0],
    ["c", 0xb],
    ["v", 0xf],
  ] as const;

  for (const [character, chip8Key] of mappings) {
    assertEquals(
      mapTerminalCharacterToChip8Key(character),
      key(chip8Key),
      `Expected "${character}" to map to CHIP-8 key ${chip8Key.toString(16)}`,
    );
  }
});

Deno.test("maps letter keys case-insensitively", () => {
  assertEquals(mapTerminalCharacterToChip8Key("Q"), key(0x4));

  assertEquals(mapTerminalCharacterToChip8Key("X"), key(0x0));

  assertEquals(mapTerminalCharacterToChip8Key("V"), key(0xf));
});

Deno.test("returns undefined for characters outside the CHIP-8 keypad mapping", () => {
  assertEquals(mapTerminalCharacterToChip8Key("5"), undefined);

  assertEquals(mapTerminalCharacterToChip8Key(" "), undefined);

  assertEquals(mapTerminalCharacterToChip8Key("p"), undefined);

  assertEquals(mapTerminalCharacterToChip8Key(""), undefined);

  assertEquals(mapTerminalCharacterToChip8Key("qw"), undefined);
});
