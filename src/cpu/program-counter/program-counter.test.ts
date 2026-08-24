import { assertEquals, assertThrows } from "@std/assert";

import { address } from "../../core/types/address.ts";
import { DEFAULT_PROGRAM_START_ADDRESS, INSTRUCTION_SIZE, ProgramCounter } from "./program-counter.ts";

Deno.test("Program Counter starts at the default program address", () => {
  const pc = new ProgramCounter();

  assertEquals(
    pc.getValue(),
    DEFAULT_PROGRAM_START_ADDRESS,
  );
});

Deno.test("Program Counter can start at a custom address", () => {
  const initialAddress = address(0x300);

  const pc = new ProgramCounter(initialAddress);

  assertEquals(
    pc.getValue(),
    initialAddress,
  );
});

Deno.test("Program Counter setValue changes the program counter", () => {
  const pc = new ProgramCounter();

  const newAddress = address(0x400);

  pc.setValue(newAddress);

  assertEquals(
    pc.getValue(),
    newAddress,
  );
});

Deno.test("Program Counter advance moves to the next instruction", () => {
  const pc = new ProgramCounter(address(0x200));

  pc.advance();

  assertEquals(
    pc.getValue(),
    address(0x202),
  );
});

Deno.test("Program Counter advance increments by exactly one instruction", () => {
  const pc = new ProgramCounter(address(0x200));

  pc.advance();
  pc.advance();
  pc.advance();

  assertEquals(
    pc.getValue(),
    address(0x206),
  );
});

Deno.test("Program Counter advance works near the upper address boundary", () => {
  const pc = new ProgramCounter(address(0xFFC));

  pc.advance();

  assertEquals(
    pc.getValue(),
    address(0xFFE),
  );
});
