import { assertEquals } from "@std/assert";

import { duration } from "./duration.ts";

Deno.test("duration creates a duration from nanoseconds", () => {
  const result = duration(123n);

  assertEquals(result, 123n);
});

Deno.test("duration preserves a negative duration", () => {
  const result = duration(-123n);

  assertEquals(result, -123n);
});
