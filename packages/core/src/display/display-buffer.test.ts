import { assertEquals, assertThrows } from "@std/assert";

import { DisplayBuffer, type SpriteOverflowBehavior } from "./display-buffer.ts";
import { byte } from "../core/types/byte.ts";
import type { FixedDisplaySpecification } from "./display-specification.ts";

function createDisplayBuffer(
  width: number,
  height: number,
  spriteOverflow: SpriteOverflowBehavior = "clip",
): DisplayBuffer {
  const specification: FixedDisplaySpecification = {
    kind: "fixed",
    width,
    height,
  };

  return new DisplayBuffer(specification, spriteOverflow);
}

Deno.test("DisplayBuffer initializes all pixels as off", () => {
  const display = createDisplayBuffer(64, 32);

  assertEquals(display.getPixel(0, 0), false);
  assertEquals(display.getPixel(32, 16), false);
  assertEquals(display.getPixel(63, 31), false);
});

Deno.test("DisplayBuffer exposes its dimensions", () => {
  const display = createDisplayBuffer(64, 32);

  assertEquals(display.width, 64);
  assertEquals(display.height, 32);

  assertEquals(display.backingWidth, 64);
  assertEquals(display.backingHeight, 32);
});

Deno.test("DisplayBuffer can turn a pixel on", () => {
  const display = createDisplayBuffer(64, 32);

  display.setPixel(10, 20, true);

  assertEquals(display.getPixel(10, 20), true);
});

Deno.test("DisplayBuffer can turn a pixel off", () => {
  const display = createDisplayBuffer(64, 32);

  display.setPixel(10, 20, true);
  display.setPixel(10, 20, false);

  assertEquals(display.getPixel(10, 20), false);
});

Deno.test("pixels are independent", () => {
  const display = createDisplayBuffer(64, 32);

  display.setPixel(10, 20, true);

  assertEquals(display.getPixel(10, 20), true);
  assertEquals(display.getPixel(11, 20), false);
  assertEquals(display.getPixel(10, 21), false);
});

Deno.test("clear() turns all pixels off", () => {
  const display = createDisplayBuffer(64, 32);

  display.setPixel(0, 0, true);
  display.setPixel(32, 16, true);
  display.setPixel(63, 31, true);

  display.clear();

  assertEquals(display.getPixel(0, 0), false);
  assertEquals(display.getPixel(32, 16), false);
  assertEquals(display.getPixel(63, 31), false);
});

Deno.test("DisplayBuffer accepts the first coordinate", () => {
  const display = createDisplayBuffer(64, 32);

  display.setPixel(0, 0, true);

  assertEquals(display.getPixel(0, 0), true);
});

Deno.test("DisplayBuffer accepts the last coordinate", () => {
  const display = createDisplayBuffer(64, 32);

  display.setPixel(63, 31, true);

  assertEquals(display.getPixel(63, 31), true);
});

Deno.test("getPixel() rejects an X coordinate equal to width", () => {
  const display = createDisplayBuffer(64, 32);

  assertThrows(() => display.getPixel(64, 0), RangeError);
});

Deno.test("setPixel() rejects an X coordinate equal to width", () => {
  const display = createDisplayBuffer(64, 32);

  assertThrows(() => display.setPixel(64, 0, true), RangeError);
});

Deno.test("getPixel() rejects a Y coordinate equal to height", () => {
  const display = createDisplayBuffer(64, 32);

  assertThrows(() => display.getPixel(0, 32), RangeError);
});

Deno.test("setPixel() rejects a Y coordinate equal to height", () => {
  const display = createDisplayBuffer(64, 32);

  assertThrows(() => display.setPixel(0, 32, true), RangeError);
});

Deno.test("DisplayBuffer rejects negative X coordinates", () => {
  const display = createDisplayBuffer(64, 32);

  assertThrows(() => display.getPixel(-1, 0), RangeError);
});

Deno.test("DisplayBuffer rejects negative Y coordinates", () => {
  const display = createDisplayBuffer(64, 32);

  assertThrows(() => display.getPixel(0, -1), RangeError);
});

Deno.test("DisplayBuffer rejects fractional X coordinates", () => {
  const display = createDisplayBuffer(64, 32);

  assertThrows(() => display.getPixel(1.5, 0), RangeError);
});

Deno.test("DisplayBuffer rejects fractional Y coordinates", () => {
  const display = createDisplayBuffer(64, 32);

  assertThrows(() => display.getPixel(0, 1.5), RangeError);
});

Deno.test("DisplayBuffer rejects zero width", () => {
  assertThrows(() => createDisplayBuffer(0, 32), RangeError);
});

Deno.test("DisplayBuffer rejects zero height", () => {
  assertThrows(() => createDisplayBuffer(64, 0), RangeError);
});

Deno.test("DisplayBuffer rejects fractional dimensions", () => {
  assertThrows(() => createDisplayBuffer(64.5, 32), RangeError);
});

Deno.test("drawSprite draws set sprite pixels", () => {
  const displayBuffer = createDisplayBuffer(8, 4);

  const result = displayBuffer.drawSprite(0, 0, [byte(0b1010_0000)]);

  assertEquals(result.collision, false);
  assertEquals(displayBuffer.getPixel(0, 0), true);
  assertEquals(displayBuffer.getPixel(1, 0), false);
  assertEquals(displayBuffer.getPixel(2, 0), true);
  assertEquals(displayBuffer.getPixel(3, 0), false);
});

Deno.test("drawSprite XORs sprite pixels with the display", () => {
  const displayBuffer = createDisplayBuffer(8, 4);

  displayBuffer.setPixel(0, 0, true);
  displayBuffer.setPixel(1, 0, true);
  displayBuffer.setPixel(2, 0, false);

  const result = displayBuffer.drawSprite(0, 0, [byte(0b1110_0000)]);

  assertEquals(result.collision, true);

  assertEquals(displayBuffer.getPixel(0, 0), false);
  assertEquals(displayBuffer.getPixel(1, 0), false);
  assertEquals(displayBuffer.getPixel(2, 0), true);
});

Deno.test("drawSprite does not report collision when drawing on blank pixels", () => {
  const displayBuffer = createDisplayBuffer(8, 4);

  const result = displayBuffer.drawSprite(0, 0, [byte(0b1111_0000)]);

  assertEquals(result.collision, false);
});

Deno.test("drawSprite wraps the initial X coordinate", () => {
  const displayBuffer = createDisplayBuffer(8, 4);

  const result = displayBuffer.drawSprite(9, 0, [byte(0b1000_0000)]);

  assertEquals(result.collision, false);
  assertEquals(displayBuffer.getPixel(1, 0), true);
});

Deno.test("drawSprite wraps the initial Y coordinate", () => {
  const displayBuffer = createDisplayBuffer(8, 4);

  const result = displayBuffer.drawSprite(0, 5, [byte(0b1000_0000)]);

  assertEquals(result.collision, false);
  assertEquals(displayBuffer.getPixel(0, 1), true);
});

Deno.test("drawSprite clips pixels beyond the right edge", () => {
  const displayBuffer = createDisplayBuffer(8, 4);

  displayBuffer.drawSprite(6, 0, [byte(0b1111_1111)]);

  assertEquals(displayBuffer.getPixel(6, 0), true);
  assertEquals(displayBuffer.getPixel(7, 0), true);
});

Deno.test("drawSprite clips rows beyond the bottom edge", () => {
  const displayBuffer = createDisplayBuffer(8, 4);

  displayBuffer.drawSprite(0, 3, [byte(0b1000_0000), byte(0b0100_0000)]);

  assertEquals(displayBuffer.getPixel(0, 3), true);

  // Row 4 is outside the display and must not wrap to row 0.
  assertEquals(displayBuffer.getPixel(1, 0), false);
});

Deno.test("drawSprite wraps pixels beyond the right edge when configured", () => {
  const displayBuffer = createDisplayBuffer(8, 4, "wrap");

  displayBuffer.drawSprite(6, 0, [byte(0b1111_0000)]);

  assertEquals(displayBuffer.getPixel(6, 0), true);

  assertEquals(displayBuffer.getPixel(7, 0), true);

  assertEquals(displayBuffer.getPixel(0, 0), true);

  assertEquals(displayBuffer.getPixel(1, 0), true);
});

Deno.test("drawSprite wraps rows beyond the bottom edge when configured", () => {
  const displayBuffer = createDisplayBuffer(8, 4, "wrap");

  displayBuffer.drawSprite(0, 3, [byte(0b1000_0000), byte(0b0100_0000)]);

  assertEquals(displayBuffer.getPixel(0, 3), true);

  assertEquals(displayBuffer.getPixel(1, 0), true);
});

Deno.test(
  "DisplayBuffer uses SUPER-CHIP backing geometry with initial low logical resolution",
  () => {
    const display = new DisplayBuffer(
      {
        kind: "superchip",
        backingWidth: 128,
        backingHeight: 64,
        initialMode: "low",
      },
      "clip",
    );

    assertEquals(display.backingWidth, 128);
    assertEquals(display.backingHeight, 64);

    assertEquals(display.width, 64);
    assertEquals(display.height, 32);
  },
);

Deno.test(
  "DisplayBuffer switches SUPER-CHIP logical resolution without clearing backing pixels",
  () => {
    const display = new DisplayBuffer(
      {
        kind: "superchip",
        backingWidth: 128,
        backingHeight: 64,
        initialMode: "low",
      },
      "clip",
    );

    display.setPixel(100, 50, true);

    assertEquals(display.width, 64);
    assertEquals(display.height, 32);

    display.setMode("high");

    assertEquals(display.width, 128);
    assertEquals(display.height, 64);
    assertEquals(display.getPixel(100, 50), true);

    display.setMode("low");

    assertEquals(display.width, 64);
    assertEquals(display.height, 32);
    assertEquals(display.getPixel(100, 50), true);
  },
);

Deno.test("DisplayBuffer rejects mode changes for fixed displays", () => {
  const display = createDisplayBuffer(64, 32);

  assertThrows(
    () => display.setMode("high"),
    Error,
    "Cannot change display mode on a fixed-geometry display.",
  );
});

Deno.test("DisplayBuffer reset clears pixels and restores SUPER-CHIP initial mode", () => {
  const display = new DisplayBuffer(
    {
      kind: "superchip",
      backingWidth: 128,
      backingHeight: 64,
      initialMode: "low",
    },
    "clip",
  );

  display.setMode("high");
  display.setPixel(100, 50, true);

  assertEquals(display.width, 128);
  assertEquals(display.height, 64);
  assertEquals(display.getPixel(100, 50), true);

  display.reset();

  assertEquals(display.width, 64);
  assertEquals(display.height, 32);
  assertEquals(display.getPixel(100, 50), false);
});

Deno.test("DisplayBuffer clear preserves SUPER-CHIP display mode", () => {
  const display = new DisplayBuffer(
    {
      kind: "superchip",
      backingWidth: 128,
      backingHeight: 64,
      initialMode: "low",
    },
    "clip",
  );

  display.setMode("high");
  display.setPixel(100, 50, true);

  display.clear();

  assertEquals(display.width, 128);
  assertEquals(display.height, 64);
  assertEquals(display.getPixel(100, 50), false);
});

Deno.test("DisplayBuffer scrolls SUPER-CHIP backing pixels down by physical rows", () => {
  const display = new DisplayBuffer(
    {
      kind: "superchip",
      backingWidth: 128,
      backingHeight: 64,
      initialMode: "low",
    },
    "clip",
  );

  display.setPixel(0, 0, true);
  display.setPixel(10, 10, true);
  display.setPixel(127, 63, true);

  display.scrollDown(1);

  assertEquals(display.getPixel(0, 0), false);
  assertEquals(display.getPixel(0, 1), true);

  assertEquals(display.getPixel(10, 10), false);
  assertEquals(display.getPixel(10, 11), true);

  // Pixel shifted beyond the bottom edge is discarded.
  assertEquals(display.getPixel(127, 63), false);

  // Scrolling does not change the logical mode.
  assertEquals(display.width, 64);
  assertEquals(display.height, 32);
});

Deno.test("DisplayBuffer scrolling down by the backing height clears the framebuffer", () => {
  const display = new DisplayBuffer(
    {
      kind: "superchip",
      backingWidth: 128,
      backingHeight: 64,
      initialMode: "low",
    },
    "clip",
  );

  display.setPixel(20, 20, true);

  display.scrollDown(64);

  assertEquals(display.getPixel(20, 20), false);
});

Deno.test("DisplayBuffer rejects scrolling for fixed displays", () => {
  const display = createDisplayBuffer(64, 32);

  assertThrows(() => display.scrollDown(4), Error, "Cannot scroll a fixed-geometry display.");
});

Deno.test("DisplayBuffer scrolls SUPER-CHIP backing pixels right by physical columns", () => {
  const display = new DisplayBuffer(
    {
      kind: "superchip",
      backingWidth: 128,
      backingHeight: 64,
      initialMode: "low",
    },
    "clip",
  );

  display.setPixel(0, 10, true);
  display.setPixel(20, 20, true);
  display.setPixel(127, 30, true);

  display.scrollRight(4);

  assertEquals(display.getPixel(0, 10), false);
  assertEquals(display.getPixel(4, 10), true);

  assertEquals(display.getPixel(20, 20), false);
  assertEquals(display.getPixel(24, 20), true);

  // Pixel shifted beyond the right edge is discarded.
  assertEquals(display.getPixel(127, 30), false);

  assertEquals(display.width, 64);
  assertEquals(display.height, 32);
});

Deno.test("DisplayBuffer scrolls SUPER-CHIP backing pixels left by physical columns", () => {
  const display = new DisplayBuffer(
    {
      kind: "superchip",
      backingWidth: 128,
      backingHeight: 64,
      initialMode: "low",
    },
    "clip",
  );

  display.setPixel(127, 10, true);
  display.setPixel(20, 20, true);
  display.setPixel(0, 30, true);

  display.scrollLeft(4);

  assertEquals(display.getPixel(127, 10), false);
  assertEquals(display.getPixel(123, 10), true);

  assertEquals(display.getPixel(20, 20), false);
  assertEquals(display.getPixel(16, 20), true);

  // Pixel shifted beyond the left edge is discarded.
  assertEquals(display.getPixel(0, 30), false);

  assertEquals(display.width, 64);
  assertEquals(display.height, 32);
});

Deno.test("drawSprite maps SUPER-CHIP low-resolution pixels to 2x2 backing blocks", () => {
  const display = new DisplayBuffer(
    {
      kind: "superchip",
      backingWidth: 128,
      backingHeight: 64,
      initialMode: "low",
    },
    "clip",
  );

  const result = display.drawSprite(1, 1, [byte(0b1000_0000)]);

  assertEquals(result.collision, false);

  assertEquals(display.getPixel(2, 2), true);
  assertEquals(display.getPixel(3, 2), true);
  assertEquals(display.getPixel(2, 3), true);
  assertEquals(display.getPixel(3, 3), true);

  assertEquals(display.getPixel(1, 2), false);
  assertEquals(display.getPixel(4, 2), false);
});

Deno.test(
  "drawSprite maps SUPER-CHIP high-resolution pixels directly to backing pixels",
  () => {
    const display = new DisplayBuffer(
      {
        kind: "superchip",
        backingWidth: 128,
        backingHeight: 64,
        initialMode: "low",
      },
      "clip",
    );

    display.setMode("high");

    display.drawSprite(1, 1, [byte(0b1000_0000)]);

    assertEquals(display.getPixel(1, 1), true);

    assertEquals(display.getPixel(2, 1), false);
    assertEquals(display.getPixel(1, 2), false);
  },
);

Deno.test(
  "drawSprite reports a low-resolution collision when any backing pixel is erased",
  () => {
    const display = new DisplayBuffer(
      {
        kind: "superchip",
        backingWidth: 128,
        backingHeight: 64,
        initialMode: "low",
      },
      "clip",
    );

    // One quarter of logical pixel (1, 1) is already on.
    display.setPixel(2, 2, true);

    const result = display.drawSprite(1, 1, [byte(0b1000_0000)]);

    assertEquals(result.collision, true);

    assertEquals(display.getPixel(2, 2), false);
    assertEquals(display.getPixel(3, 2), true);
    assertEquals(display.getPixel(2, 3), true);
    assertEquals(display.getPixel(3, 3), true);
  },
);

Deno.test("drawSprite reports the number of sprite rows containing collisions", () => {
  const display = createDisplayBuffer(8, 8);

  display.setPixel(0, 0, true);
  display.setPixel(1, 0, true);
  display.setPixel(0, 1, true);

  const result = display.drawSprite(0, 0, [byte(0b1100_0000), byte(0b1000_0000)]);

  assertEquals(result, {
    collision: true,
    collisionRows: 2,
    clippedBottomRows: 0,
  });
});

Deno.test("drawSprite reports sprite rows clipped below the bottom edge", () => {
  const display = createDisplayBuffer(8, 4);

  const result = display.drawSprite(0, 3, [
    byte(0b1000_0000),
    byte(0b1000_0000),
    byte(0b1000_0000),
  ]);

  assertEquals(result, {
    collision: false,
    collisionRows: 0,
    clippedBottomRows: 2,
  });

  assertEquals(display.getPixel(0, 3), true);
});

Deno.test("DisplayBuffer exposes its current display mode", () => {
  const fixed = createDisplayBuffer(64, 32);

  assertEquals(fixed.mode, null);

  const superChip = new DisplayBuffer(
    {
      kind: "superchip",
      backingWidth: 128,
      backingHeight: 64,
      initialMode: "low",
    },
    "clip",
  );

  assertEquals(superChip.mode, "low");

  superChip.setMode("high");

  assertEquals(superChip.mode, "high");

  superChip.reset();

  assertEquals(superChip.mode, "low");
});

Deno.test("drawWideSprite draws 16-bit-wide rows", () => {
  const display = new DisplayBuffer(
    {
      kind: "superchip",
      backingWidth: 128,
      backingHeight: 64,
      initialMode: "low",
    },
    "clip",
  );

  display.setMode("high");

  const result = display.drawWideSprite(10, 5, [byte(0b1000_0000), byte(0b0000_0001)]);

  assertEquals(result, {
    collision: false,
    collisionRows: 0,
    clippedBottomRows: 0,
  });

  // First and sixteenth logical pixels of the row.
  assertEquals(display.getPixel(10, 5), true);
  assertEquals(display.getPixel(25, 5), true);

  // Interior pixels remain clear.
  assertEquals(display.getPixel(11, 5), false);
  assertEquals(display.getPixel(24, 5), false);
});

Deno.test("drawWideSprite rejects an odd sprite byte count", () => {
  const display = new DisplayBuffer(
    {
      kind: "superchip",
      backingWidth: 128,
      backingHeight: 64,
      initialMode: "low",
    },
    "clip",
  );

  assertThrows(
    () => display.drawWideSprite(0, 0, [byte(0xff)]),
    RangeError,
    "Invalid wide sprite byte count",
  );
});
