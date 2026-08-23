import { assert } from "@std/assert";
import { DefaultRandomNumberGenerator } from "./default-random-number-generator.ts";

Deno.test("DefaultRandomNumberGenerator produces bytes", () => {
  const random = new DefaultRandomNumberGenerator();

  for (let i = 0; i < 1_000; i++) {
    const value = random.nextByte();

    assert(value >= 0x00);
    assert(value <= 0xff);
    assert(Number.isInteger(value));
  }
});
