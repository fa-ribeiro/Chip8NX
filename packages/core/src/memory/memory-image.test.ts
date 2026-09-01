import { assertEquals, assertThrows } from "@std/assert";

import { byte } from "../core/types/byte.ts";
import { MemoryImage } from "./memory-image.ts";

Deno.test("MemoryImage contains the supplied bytes", () => {
  const image = new MemoryImage([0x12, 0x34, 0x56]);

  assertEquals(image.bytes, [byte(0x12), byte(0x34), byte(0x56)]);
});

Deno.test("MemoryImage accepts Uint8Array binary data", () => {
  const image = new MemoryImage(new Uint8Array([0x12, 0x34, 0x56]));

  assertEquals(image.bytes, [byte(0x12), byte(0x34), byte(0x56)]);
});

Deno.test("MemoryImage copies its source data", () => {
  const source = [0x12, 0x34];

  const image = new MemoryImage(source);

  source[0] = 0xff;

  assertEquals(image.bytes, [byte(0x12), byte(0x34)]);
});

Deno.test("MemoryImage rejects values outside the byte range", () => {
  assertThrows(() => new MemoryImage([0x00, 0x100]), RangeError);
});
