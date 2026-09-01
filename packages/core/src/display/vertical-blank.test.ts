import { assertEquals } from "@std/assert";
import { VerticalBlank } from "./vertical-blank.ts";

Deno.test("vertical blank starts unavailable", () => {
  const verticalBlank = new VerticalBlank();

  assertEquals(verticalBlank.consume(), false);
});

Deno.test("signal makes one vertical blank available", () => {
  const verticalBlank = new VerticalBlank();

  verticalBlank.signal();

  assertEquals(verticalBlank.consume(), true);
  assertEquals(verticalBlank.consume(), false);
});

Deno.test("multiple signals do not accumulate vertical blank opportunities", () => {
  const verticalBlank = new VerticalBlank();

  verticalBlank.signal();
  verticalBlank.signal();
  verticalBlank.signal();

  assertEquals(verticalBlank.consume(), true);
  assertEquals(verticalBlank.consume(), false);
});

Deno.test("reset discards a pending vertical blank", () => {
  const verticalBlank = new VerticalBlank();

  verticalBlank.signal();
  verticalBlank.reset();

  assertEquals(verticalBlank.consume(), false);
});

Deno.test("vertical blank can be signaled again after being consumed", () => {
  const verticalBlank = new VerticalBlank();

  verticalBlank.signal();

  assertEquals(verticalBlank.consume(), true);

  verticalBlank.signal();

  assertEquals(verticalBlank.consume(), true);
  assertEquals(verticalBlank.consume(), false);
});

Deno.test("isPending reports availability without consuming it", () => {
  const verticalBlank = new VerticalBlank();

  assertEquals(verticalBlank.isPending, false);

  verticalBlank.signal();

  assertEquals(verticalBlank.isPending, true);
  assertEquals(verticalBlank.isPending, true);

  assertEquals(verticalBlank.consume(), true);
  assertEquals(verticalBlank.isPending, false);
});
