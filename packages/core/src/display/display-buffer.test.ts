import { assertEquals, assertThrows } from "@std/assert";

import { DisplayBuffer } from "./display-buffer.ts";
import { byte } from "../core/types/byte.ts";

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

  assertThrows(() => display.getPixel(64, 0), RangeError);
});

Deno.test("setPixel() rejects an X coordinate equal to width", () => {
  const display = new DisplayBuffer(64, 32);

  assertThrows(() => display.setPixel(64, 0, true), RangeError);
});

Deno.test("getPixel() rejects a Y coordinate equal to height", () => {
  const display = new DisplayBuffer(64, 32);

  assertThrows(() => display.getPixel(0, 32), RangeError);
});

Deno.test("setPixel() rejects a Y coordinate equal to height", () => {
  const display = new DisplayBuffer(64, 32);

  assertThrows(() => display.setPixel(0, 32, true), RangeError);
});

Deno.test("DisplayBuffer rejects negative X coordinates", () => {
  const display = new DisplayBuffer(64, 32);

  assertThrows(() => display.getPixel(-1, 0), RangeError);
});

Deno.test("DisplayBuffer rejects negative Y coordinates", () => {
  const display = new DisplayBuffer(64, 32);

  assertThrows(() => display.getPixel(0, -1), RangeError);
});

Deno.test("DisplayBuffer rejects fractional X coordinates", () => {
  const display = new DisplayBuffer(64, 32);

  assertThrows(() => display.getPixel(1.5, 0), RangeError);
});

Deno.test("DisplayBuffer rejects fractional Y coordinates", () => {
  const display = new DisplayBuffer(64, 32);

  assertThrows(() => display.getPixel(0, 1.5), RangeError);
});

Deno.test("DisplayBuffer rejects zero width", () => {
  assertThrows(() => new DisplayBuffer(0, 32), RangeError);
});

Deno.test("DisplayBuffer rejects zero height", () => {
  assertThrows(() => new DisplayBuffer(64, 0), RangeError);
});

Deno.test("DisplayBuffer rejects fractional dimensions", () => {
  assertThrows(() => new DisplayBuffer(64.5, 32), RangeError);
});

Deno.test("drawSprite draws set sprite pixels", () => {
  const displayBuffer = new DisplayBuffer(8, 4);

  const collision = displayBuffer.drawSprite(0, 0, [byte(0b1010_0000)]);

  assertEquals(collision, false);
  assertEquals(displayBuffer.getPixel(0, 0), true);
  assertEquals(displayBuffer.getPixel(1, 0), false);
  assertEquals(displayBuffer.getPixel(2, 0), true);
  assertEquals(displayBuffer.getPixel(3, 0), false);
});

Deno.test("drawSprite XORs sprite pixels with the display", () => {
  const displayBuffer = new DisplayBuffer(8, 4);

  displayBuffer.setPixel(0, 0, true);
  displayBuffer.setPixel(1, 0, true);
  displayBuffer.setPixel(2, 0, false);

  const collision = displayBuffer.drawSprite(0, 0, [byte(0b1110_0000)]);

  assertEquals(collision, true);

  assertEquals(displayBuffer.getPixel(0, 0), false);
  assertEquals(displayBuffer.getPixel(1, 0), false);
  assertEquals(displayBuffer.getPixel(2, 0), true);
});

Deno.test(
  "drawSprite does not report collision when drawing on blank pixels",
  () => {
    const displayBuffer = new DisplayBuffer(8, 4);

    const collision = displayBuffer.drawSprite(0, 0, [byte(0b1111_0000)]);

    assertEquals(collision, false);
  },
);

Deno.test("drawSprite wraps the initial X coordinate", () => {
  const displayBuffer = new DisplayBuffer(8, 4);

  const collision = displayBuffer.drawSprite(9, 0, [byte(0b1000_0000)]);

  assertEquals(collision, false);
  assertEquals(displayBuffer.getPixel(1, 0), true);
});

Deno.test("drawSprite wraps the initial Y coordinate", () => {
  const displayBuffer = new DisplayBuffer(8, 4);

  const collision = displayBuffer.drawSprite(0, 5, [byte(0b1000_0000)]);

  assertEquals(collision, false);
  assertEquals(displayBuffer.getPixel(0, 1), true);
});

Deno.test("drawSprite clips pixels beyond the right edge", () => {
  const displayBuffer = new DisplayBuffer(8, 4);

  displayBuffer.drawSprite(6, 0, [byte(0b1111_1111)]);

  assertEquals(displayBuffer.getPixel(6, 0), true);
  assertEquals(displayBuffer.getPixel(7, 0), true);
});

Deno.test("drawSprite clips rows beyond the bottom edge", () => {
  const displayBuffer = new DisplayBuffer(8, 4);

  displayBuffer.drawSprite(0, 3, [byte(0b1000_0000), byte(0b0100_0000)]);

  assertEquals(displayBuffer.getPixel(0, 3), true);

  // Row 4 is outside the display and must not wrap to row 0.
  assertEquals(displayBuffer.getPixel(1, 0), false);
});
