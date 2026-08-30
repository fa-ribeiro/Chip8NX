import { assertEquals, assertThrows } from "@std/assert";

import { address } from "../core/types/address.ts";
import { byte } from "../core/types/byte.ts";
import { MemoryImage } from "./memory-image.ts";
import { MemoryImageLoader } from "./memory-image-loader.ts";
import { Ram } from "./ram.ts";

Deno.test("MemoryImageLoader loads image bytes sequentially from the specified address", () => {
  const memory = new Ram(0x1000);
  const image = new MemoryImage([0x10, 0x20, 0x30]);

  const loader = new MemoryImageLoader();

  loader.load(memory, address(0x300), image);

  assertEquals(memory.read(address(0x300)), byte(0x10));

  assertEquals(memory.read(address(0x301)), byte(0x20));

  assertEquals(memory.read(address(0x302)), byte(0x30));
});

Deno.test("MemoryImageLoader does not modify memory outside the image range", () => {
  const memory = new Ram(0x1000);
  const image = new MemoryImage([0x10, 0x20, 0x30]);

  memory.write(address(0x2ff), byte(0xaa));

  memory.write(address(0x303), byte(0xbb));

  const loader = new MemoryImageLoader();

  loader.load(memory, address(0x300), image);

  assertEquals(memory.read(address(0x2ff)), byte(0xaa));

  assertEquals(memory.read(address(0x303)), byte(0xbb));
});

Deno.test("MemoryImageLoader propagates memory address errors", () => {
  const memory = new Ram(4);
  const image = new MemoryImage([0xaa, 0xbb]);

  const loader = new MemoryImageLoader();

  assertThrows(() => loader.load(memory, address(3), image), RangeError);
});
