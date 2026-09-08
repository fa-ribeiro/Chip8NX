import { assertEquals } from "@std/assert";

import {
  address,
  ClassicInstructionFormatter,
  Decoder,
  MemoryImage,
  MemoryImageLoader,
  Ram,
} from "@chip8nx/core";

import { Disassembler } from "../../mod.ts";

Deno.test("public API disassembles a CHIP-8 program", () => {
  // prettier-ignore
  // deno-fmt-ignore
  const rom = new Uint8Array([
    0x00, 0xe0, // CLS
    0x60, 0x01, // LD V0, 0x01
    0x61, 0x02, // LD V1, 0x02
    0x80, 0x14, // ADD V0, V1
    0x12, 0x00,
  ]);

  const memory = new Ram(0x1000);
  const image = new MemoryImage(rom);

  new MemoryImageLoader().load(memory, address(0x200), image);

  const disassembler = new Disassembler(new Decoder(), new ClassicInstructionFormatter());

  const result = disassembler.disassemble(memory, address(0x200), rom.length);

  assertEquals(
    result.map((entry) => ({
      address: entry.address,
      text: entry.text,
    })),
    [
      {
        address: address(0x200),
        text: "CLS",
      },
      {
        address: address(0x202),
        text: "LD V0, 0x01",
      },
      {
        address: address(0x204),
        text: "LD V1, 0x02",
      },
      {
        address: address(0x206),
        text: "ADD V0, V1",
      },
      {
        address: address(0x208),
        text: "JP 0x200",
      },
    ],
  );
});
