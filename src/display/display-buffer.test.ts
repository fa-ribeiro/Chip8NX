import { assertEquals, assertThrows } from "@std/assert";
import { DisplayBuffer } from "./display-buffer.ts";

Deno.test("DisplayBuffer initializes all pixels as off", () => {
  const display = new DisplayBuffer(64, 32);

  assertEquals(display.getPixel(0, 0), false);
  assertEquals(display.getPixel(32, 16), false);
  assertEquals(display.getPixel(63, 31), false);
});

Deno.test("DisplayBuffer exposes its dimensions", () => {
  const display = new DisplayBuffer(64, 32);

  assertEquals(display.width, 64);
  assertEquals(display.height, 32);
});

Deno.test("DisplayBuffer can turn a pixel on", () => {
  const display = new DisplayBuffer(64, 32);

  display.setPixel(10, 20, true);

  assertEquals(display.getPixel(10, 20), true);
});

Deno.test("DisplayBuffer can turn a pixel off", () => {
  const display = new DisplayBuffer(64, 32);

  display.setPixel(10, 20, true);
  display.setPixel(10, 20, false);

  assertEquals(display.getPixel(10, 20), false);
});

Deno.test("pixels are independent", () => {
  const display = new DisplayBuffer(64, 32);

  display.setPixel(10, 20, true);

  assertEquals(display.getPixel(10, 20), true);
  assertEquals(display.getPixel(11, 20), false);
  assertEquals(display.getPixel(10, 21), false);
});

Deno.test("clear() turns all pixels off", () => {
  const display = new DisplayBuffer(64, 32);

  display.setPixel(0, 0, true);
  display.setPixel(32, 16, true);
  display.setPixel(63, 31, true);

  display.clear();

  assertEquals(display.getPixel(0, 0), false);
  assertEquals(display.getPixel(32, 16), false);
  assertEquals(display.getPixel(63, 31), false);
});

Deno.test("DisplayBuffer accepts the first coordinate", () => {
  const display = new DisplayBuffer(64, 32);

  display.setPixel(0, 0, true);

  assertEquals(display.getPixel(0, 0), true);
});

Deno.test("DisplayBuffer accepts the last coordinate", () => {
  const display = new DisplayBuffer(64, 32);

  display.setPixel(63, 31, true);

  assertEquals(display.getPixel(63, 31), true);
});

Deno.test("getPixel() rejects an X coordinate equal to width", () => {
  const display = new DisplayBuffer(64, 32);

  assertThrows(
    () => display.getPixel(64, 0),
    RangeError,
  );
});

Deno.test("setPixel() rejects an X coordinate equal to width", () => {
  const display = new DisplayBuffer(64, 32);

  assertThrows(
    () => display.setPixel(64, 0, true),
    RangeError,
  );
});

Deno.test("getPixel() rejects a Y coordinate equal to height", () => {
  const display = new DisplayBuffer(64, 32);

  assertThrows(
    () => display.getPixel(0, 32),
    RangeError,
  );
});

Deno.test("setPixel() rejects a Y coordinate equal to height", () => {
  const display = new DisplayBuffer(64, 32);

  assertThrows(
    () => display.setPixel(0, 32, true),
    RangeError,
  );
});

Deno.test("DisplayBuffer rejects negative X coordinates", () => {
  const display = new DisplayBuffer(64, 32);

  assertThrows(
    () => display.getPixel(-1, 0),
    RangeError,
  );
});

Deno.test("DisplayBuffer rejects negative Y coordinates", () => {
  const display = new DisplayBuffer(64, 32);

  assertThrows(
    () => display.getPixel(0, -1),
    RangeError,
  );
});

Deno.test("DisplayBuffer rejects fractional X coordinates", () => {
  const display = new DisplayBuffer(64, 32);

  assertThrows(
    () => display.getPixel(1.5, 0),
    RangeError,
  );
});

Deno.test("DisplayBuffer rejects fractional Y coordinates", () => {
  const display = new DisplayBuffer(64, 32);

  assertThrows(
    () => display.getPixel(0, 1.5),
    RangeError,
  );
});

Deno.test("DisplayBuffer rejects zero width", () => {
  assertThrows(
    () => new DisplayBuffer(0, 32),
    RangeError,
  );
});

Deno.test("DisplayBuffer rejects zero height", () => {
  assertThrows(
    () => new DisplayBuffer(64, 0),
    RangeError,
  );
});

Deno.test("DisplayBuffer rejects fractional dimensions", () => {
  assertThrows(
    () => new DisplayBuffer(64.5, 32),
    RangeError,
  );
});
