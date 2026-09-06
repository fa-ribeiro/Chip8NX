import { assertEquals } from "@std/assert";
import type { Timestamp } from "./timestamp.ts";
import { timestamp } from "./timestamp.ts";

Deno.test("timestamp function returns the same value", () => {
  const value: Timestamp = 123n as Timestamp;
  const result = timestamp(value);
  assertEquals(result, value);
});
