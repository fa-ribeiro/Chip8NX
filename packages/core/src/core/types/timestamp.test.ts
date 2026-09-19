import { assertEquals } from "@std/assert";

import { timestamp } from "./timestamp.ts";

Deno.test("timestamp creates a timestamp from nanoseconds", () => {
  const result = timestamp(123n);

  assertEquals(result, 123n);
});
