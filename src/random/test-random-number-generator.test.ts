import { assertEquals } from "@std/assert";
import { byte } from "../core/types/byte.ts";
import { TestRandomNumberGenerator } from "./test-random-number-generator.ts";

Deno.test("TestRandomNumberGenerator returns values in order", () => {
  const random = new TestRandomNumberGenerator([
    byte(0x12),
    byte(0xab),
    byte(0x42),
  ]);

  assertEquals(random.nextByte(), byte(0x12));
  assertEquals(random.nextByte(), byte(0xab));
  assertEquals(random.nextByte(), byte(0x42));
});
