import { assertEquals } from "@std/assert";

import { byte } from "../../core/types/byte.ts";
import { registerIndex } from "./register-index.ts";
import { REGISTER_COUNT, Registers } from "./registers.ts";

Deno.test("Registers all registers initially contain zero", () => {
  const registers = new Registers();

  for (let index = 0; index < REGISTER_COUNT; index++) {
    assertEquals(
      registers.get(registerIndex(index)),
      byte(0),
    );
  }
});

Deno.test("Registers set stores a value in the selected register", () => {
  const registers = new Registers();

  const index = registerIndex(5);
  const value = byte(0x42);

  registers.set(index, value);

  assertEquals(registers.get(index), value);
});

Deno.test("Registers registers are independent", () => {
  const registers = new Registers();

  registers.set(registerIndex(0), byte(0x11));
  registers.set(registerIndex(1), byte(0x22));

  assertEquals(
    registers.get(registerIndex(0)),
    byte(0x11),
  );

  assertEquals(
    registers.get(registerIndex(1)),
    byte(0x22),
  );
});

Deno.test("Registers VF can be addressed like any other register", () => {
  const registers = new Registers();

  registers.set(
    registerIndex(0xF),
    byte(0xFF),
  );

  assertEquals(
    registers.get(registerIndex(0xF)),
    byte(0xFF),
  );
});

Deno.test("Registers snapshot contains all registers", () => {
  const registers = new Registers();

  registers.set(registerIndex(0), byte(0x12));
  registers.set(registerIndex(0xF), byte(0xAB));

  const snapshot = registers.snapshot();

  assertEquals(snapshot.length, REGISTER_COUNT);
  assertEquals(snapshot[0], byte(0x12));
  assertEquals(snapshot[0xF], byte(0xAB));
});

Deno.test("Registers snapshot is independent from the register bank", () => {
  const registers = new Registers();

  registers.set(
    registerIndex(0),
    byte(0x12),
  );

  const snapshot = registers.snapshot();

  registers.set(
    registerIndex(0),
    byte(0x34),
  );

  assertEquals(snapshot[0], byte(0x12));
  assertEquals(
    registers.get(registerIndex(0)),
    byte(0x34),
  );
});
