import { assertEquals } from "@std/assert";

import { address } from "../../core/types/address.ts";
import { ProgramCounter } from "./program-counter.ts";

Deno.test("Program Counter starts at the supplied address", () => {
  const initialAddress = address(0x300);

  const pc = new ProgramCounter(initialAddress);

  assertEquals(pc.getValue(), initialAddress);
});

Deno.test("Program Counter setValue changes the program counter", () => {
  const pc = new ProgramCounter(address(0x200));

  const newAddress = address(0x400);

  pc.setValue(newAddress);

  assertEquals(pc.getValue(), newAddress);
});

Deno.test("Program Counter advance moves to the next instruction", () => {
  const pc = new ProgramCounter(address(0x200));

  pc.advance();

  assertEquals(pc.getValue(), address(0x202));
});

Deno.test(
  "Program Counter advance increments by exactly one instruction",
  () => {
    const pc = new ProgramCounter(address(0x200));

    pc.advance();
    pc.advance();
    pc.advance();

    assertEquals(pc.getValue(), address(0x206));
  },
);
