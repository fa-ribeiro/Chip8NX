import { assertEquals } from "@std/assert";

import { address } from "../../core/types/address.ts";
import { byte } from "../../core/types/byte.ts";
import type { CpuState } from "./cpu-state.ts";

Deno.test("CpuState represents a CPU snapshot", () => {
  const state: CpuState = {
    registers: [
      byte(0x10),
      byte(0x20),
      byte(0x30),
      byte(0x40),
      byte(0x50),
      byte(0x60),
      byte(0x70),
      byte(0x80),
      byte(0x90),
      byte(0xA0),
      byte(0xB0),
      byte(0xC0),
      byte(0xD0),
      byte(0xE0),
      byte(0xF0),
      byte(0xFF),
    ],
    index: address(0x300),
    programCounter: address(0x200),
    stack: [
      address(0x220),
      address(0x240),
    ],
    delayTimer: byte(10),
    soundTimer: byte(20),
  };

  assertEquals(state.registers.length, 16);
  assertEquals(state.registers[0], byte(0x10));
  assertEquals(state.registers[15], byte(0xFF));

  assertEquals(state.index, address(0x300));
  assertEquals(state.programCounter, address(0x200));

  assertEquals(state.stack.length, 2);
  assertEquals(state.stack[0], address(0x220));
  assertEquals(state.stack[1], address(0x240));

  assertEquals(state.delayTimer, byte(10));
  assertEquals(state.soundTimer, byte(20));
});
