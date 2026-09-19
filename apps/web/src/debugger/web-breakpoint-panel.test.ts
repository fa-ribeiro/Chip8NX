import { assertEquals } from "@std/assert";
import { address } from "@chip8nx/core";
import { parseBreakpointAddress } from "./web-breakpoint-panel.ts";

Deno.test("parseBreakpointAddress accepts a hexadecimal address with 0x prefix", () => {
  assertEquals(parseBreakpointAddress("0x204", 0x1000), {
    outcome: "success",
    address: address(0x204),
  });
});

Deno.test("parseBreakpointAddress interprets a bare address as hexadecimal", () => {
  assertEquals(parseBreakpointAddress("204", 0x1000), {
    outcome: "success",
    address: address(0x204),
  });
});

Deno.test("parseBreakpointAddress accepts upper- and lower-case hexadecimal digits", () => {
  assertEquals(parseBreakpointAddress("  2aF  ", 0x1000), {
    outcome: "success",
    address: address(0x2af),
  });
});

Deno.test("parseBreakpointAddress accepts an odd instruction address", () => {
  assertEquals(parseBreakpointAddress("201", 0x1000), {
    outcome: "success",
    address: address(0x201),
  });
});

Deno.test("parseBreakpointAddress accepts the final address in machine memory", () => {
  assertEquals(parseBreakpointAddress("FFF", 0x1000), {
    outcome: "success",
    address: address(0xfff),
  });
});

Deno.test("parseBreakpointAddress rejects an empty address", () => {
  assertEquals(parseBreakpointAddress("   ", 0x1000), {
    outcome: "failure",
    message: "Enter a hexadecimal address such as 0x200.",
  });
});

Deno.test("parseBreakpointAddress rejects malformed hexadecimal input", () => {
  assertEquals(parseBreakpointAddress("0x20G", 0x1000), {
    outcome: "failure",
    message: "Enter a hexadecimal address such as 0x200.",
  });
});

Deno.test("parseBreakpointAddress rejects an address outside machine memory", () => {
  assertEquals(parseBreakpointAddress("1000", 0x1000), {
    outcome: "failure",
    message: "Address must be between 0x000 and 0xFFF.",
  });
});
