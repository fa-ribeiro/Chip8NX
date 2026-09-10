import { DisplayBuffer } from "@chip8nx/core";
import { assertEquals, assertThrows } from "@std/assert";
import { CanvasDisplay, type CanvasDisplayPalette } from "./canvas-display.ts";

const TEST_PALETTE: CanvasDisplayPalette = {
  background: "#112233",
  foreground: "#aabbcc",
};

Deno.test("CanvasDisplay renders CHIP-8 pixels into the canvas backing store", () => {
  const canvas = new RecordingCanvas();

  const display = new CanvasDisplay(
    canvas as unknown as HTMLCanvasElement,
    TEST_PALETTE,
  );

  const buffer = new DisplayBuffer(2, 2);

  buffer.setPixel(0, 0, true);
  buffer.setPixel(1, 1, true);

  display.render(buffer);

  assertEquals(canvas.width, 2);
  assertEquals(canvas.height, 2);

  assertEquals(canvas.context.calls, [
    {
      fillStyle: "#112233",
      x: 0,
      y: 0,
      width: 2,
      height: 2,
    },
    {
      fillStyle: "#aabbcc",
      x: 0,
      y: 0,
      width: 1,
      height: 1,
    },
    {
      fillStyle: "#aabbcc",
      x: 1,
      y: 1,
      width: 1,
      height: 1,
    },
  ]);
});

Deno.test("CanvasDisplay uses an updated palette on future renders", () => {
  const canvas = new RecordingCanvas();

  const display = new CanvasDisplay(
    canvas as unknown as HTMLCanvasElement,
    TEST_PALETTE,
  );

  display.setPalette({
    background: "#221100",
    foreground: "#ffb347",
  });

  const buffer = new DisplayBuffer(1, 1);
  buffer.setPixel(0, 0, true);

  display.render(buffer);

  assertEquals(canvas.context.calls, [
    {
      fillStyle: "#221100",
      x: 0,
      y: 0,
      width: 1,
      height: 1,
    },
    {
      fillStyle: "#ffb347",
      x: 0,
      y: 0,
      width: 1,
      height: 1,
    },
  ]);
});

Deno.test("CanvasDisplay rejects canvases without a 2D rendering context", () => {
  const canvas = {
    width: 64,
    height: 32,
    getContext: () => null,
  };

  assertThrows(
    () =>
      new CanvasDisplay(
        canvas as unknown as HTMLCanvasElement,
        TEST_PALETTE,
      ),
    Error,
    "Canvas 2D rendering context is unavailable.",
  );
});

interface FillCall {
  readonly fillStyle: string;
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

class RecordingCanvas {
  public width = 300;
  public height = 150;

  public readonly context = new RecordingContext();

  public getContext(contextId: string): CanvasRenderingContext2D | null {
    if (contextId !== "2d") {
      return null;
    }

    return this.context as unknown as CanvasRenderingContext2D;
  }
}

class RecordingContext {
  public fillStyle = "";

  public readonly calls: FillCall[] = [];

  public fillRect(
    x: number,
    y: number,
    width: number,
    height: number,
  ): void {
    this.calls.push({
      fillStyle: this.fillStyle,
      x,
      y,
      width,
      height,
    });
  }
}
