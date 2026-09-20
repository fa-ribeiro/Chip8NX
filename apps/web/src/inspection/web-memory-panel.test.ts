import { assertEquals } from "@std/assert";
import { address, byte, Ram } from "@chip8nx/core";

import {
  inspectMemoryPage,
  MEMORY_PAGE_SIZE,
  nextMemoryPageStart,
  parseMemoryAddress,
  previousMemoryPageStart,
} from "./web-memory-panel.ts";

Deno.test("parseMemoryAddress accepts a hexadecimal address with 0x prefix", () => {
  assertEquals(parseMemoryAddress("0x2AF", 0x1000), {
    outcome: "success",
    address: address(0x2af),
  });
});

Deno.test("parseMemoryAddress interprets a bare address as hexadecimal", () => {
  assertEquals(parseMemoryAddress("2af", 0x1000), {
    outcome: "success",
    address: address(0x2af),
  });
});

Deno.test("parseMemoryAddress accepts an odd address and the final memory byte", () => {
  assertEquals(parseMemoryAddress("fff", 0x1000), {
    outcome: "success",
    address: address(0xfff),
  });
});

Deno.test("parseMemoryAddress rejects malformed hexadecimal input", () => {
  assertEquals(parseMemoryAddress("0x20g", 0x1000), {
    outcome: "failure",
    message: "Enter a hexadecimal address such as 0x200.",
  });
});

Deno.test("parseMemoryAddress rejects an address outside the active memory", () => {
  assertEquals(parseMemoryAddress("1000", 0x1000), {
    outcome: "failure",
    message: "Address must be between 0x000 and 0xFFF.",
  });
});

Deno.test("inspectMemoryPage starts at the exact unaligned address", () => {
  const memory = new Ram(0x100);

  memory.write(address(0x03), byte(0xaa));
  memory.write(address(0x04), byte(0xbb));

  const page = inspectMemoryPage(memory, address(0x03));

  assertEquals(page.startAddress, address(0x03));
  assertEquals(page.endAddress, address(0x42));
  assertEquals(page.rows.length, 8);
  assertEquals(page.rows[0], {
    address: address(0x03),
    bytes: [byte(0xaa), byte(0xbb), byte(0), byte(0), byte(0), byte(0), byte(0), byte(0)],
  });
});

Deno.test("inspectMemoryPage returns one complete 64-byte page when available", () => {
  const memory = new Ram(0x100);

  const page = inspectMemoryPage(memory, address(0x40));

  assertEquals(page.startAddress, address(0x40));
  assertEquals(page.endAddress, address(0x7f));
  assertEquals(page.rows.length, MEMORY_PAGE_SIZE / 8);
  assertEquals(page.rows[7]?.address, address(0x78));
  assertEquals(page.rows[7]?.bytes.length, 8);
});

Deno.test("inspectMemoryPage truncates at the end of memory", () => {
  const memory = new Ram(0x100);

  memory.write(address(0xfe), byte(0xaa));
  memory.write(address(0xff), byte(0xbb));

  const page = inspectMemoryPage(memory, address(0xfe));

  assertEquals(page.endAddress, address(0xff));
  assertEquals(page.rows, [
    {
      address: address(0xfe),
      bytes: [byte(0xaa), byte(0xbb)],
    },
  ]);
});

Deno.test("previousMemoryPageStart moves back one page without alignment", () => {
  assertEquals(previousMemoryPageStart(address(0x203)), address(0x1c3));
});

Deno.test("previousMemoryPageStart clamps the final partial step to zero", () => {
  assertEquals(previousMemoryPageStart(address(0x20)), address(0));
  assertEquals(previousMemoryPageStart(address(0)), undefined);
});

Deno.test("nextMemoryPageStart moves forward one page without alignment", () => {
  assertEquals(nextMemoryPageStart(address(0x203), 0x1000), address(0x243));
});

Deno.test("nextMemoryPageStart clamps to the final full page", () => {
  assertEquals(nextMemoryPageStart(address(0xfa0), 0x1000), address(0xfc0));
  assertEquals(nextMemoryPageStart(address(0xfc0), 0x1000), undefined);
  assertEquals(nextMemoryPageStart(address(0xfff), 0x1000), undefined);
});
