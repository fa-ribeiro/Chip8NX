import { assertEquals, assertThrows } from "@std/assert";
import { address } from "../core/types/address.ts";
import { byte } from "../core/types/byte.ts";
import { Ram } from "./ram.ts";

Deno.test("Ram starts with all bytes initialized to zero", () => {
  const memory = new Ram(0x1000);

  assertEquals(memory.read(address(0x000)), byte(0x00));
  assertEquals(memory.read(address(0x200)), byte(0x00));
  assertEquals(memory.read(address(0xfff)), byte(0x00));
});

Deno.test("Ram can write and read a byte", () => {
  const memory = new Ram(0x1000);

  memory.write(address(0x200), byte(0x42));

  assertEquals(
    memory.read(address(0x200)),
    byte(0x42),
  );
});

Deno.test("Ram writes to different addresses are independent", () => {
  const memory = new Ram(0x1000);

  memory.write(address(0x200), byte(0x42));
  memory.write(address(0x201), byte(0x99));

  assertEquals(memory.read(address(0x200)), byte(0x42));
  assertEquals(memory.read(address(0x201)), byte(0x99));
});

Deno.test("Ram can access the first address", () => {
  const memory = new Ram(0x1000);

  memory.write(address(0x000), byte(0xaa));

  assertEquals(memory.read(address(0x000)), byte(0xaa));
});

Deno.test("Ram can access the last address", () => {
  const memory = new Ram(0x1000);

  memory.write(address(0xfff), byte(0xbb));

  assertEquals(memory.read(address(0xfff)), byte(0xbb));
});

Deno.test("Ram read throws when address is outside the address space", () => {
  const memory = new Ram(0x1000);

  assertThrows(
    () => memory.read(address(0x1000)),
    RangeError,
  );
});

Deno.test("Ram write throws when address is outside the address space", () => {
  const memory = new Ram(0x1000);

  assertThrows(
    () => memory.write(address(0x1000), byte(0x42)),
    RangeError,
  );
});

Deno.test("Ram rejects a zero-sized memory", () => {
  assertThrows(
    () => new Ram(0),
    RangeError,
  );
});

Deno.test("Ram rejects a negative size", () => {
  assertThrows(
    () => new Ram(-1),
    RangeError,
  );
});

Deno.test("Ram rejects a fractional size", () => {
  assertThrows(
    () => new Ram(1.5),
    RangeError,
  );
});
