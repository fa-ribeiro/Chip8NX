import { type Display, DisplayBuffer } from "@chip8nx/core";

/**
 * Browser display adapter backed by an HTML canvas.
 *
 * Each CHIP-8 framebuffer pixel maps to one canvas backing-store pixel.
 * CSS is responsible for scaling the canvas for presentation.
 *
 * Rendering only observes the DisplayBuffer. It does not participate in
 * emulated CHIP-8 display timing or vertical-blank signaling.
 */
export class CanvasDisplay implements Display {
  private readonly context: CanvasRenderingContext2D;

  public constructor(private readonly canvas: HTMLCanvasElement) {
    const context = canvas.getContext("2d");

    if (context === null) {
      throw new Error("Canvas 2D rendering context is unavailable.");
    }

    this.context = context;
  }

  /**
   * Presents the current CHIP-8 framebuffer.
   */
  public render(buffer: DisplayBuffer): void {
    this.resizeBackingStore(buffer);

    this.context.fillStyle = "#000000";

    this.context.fillRect(0, 0, buffer.width, buffer.height);

    this.context.fillStyle = "#ffffff";

    for (let y = 0; y < buffer.height; y++) {
      for (let x = 0; x < buffer.width; x++) {
        if (!buffer.getPixel(x, y)) {
          continue;
        }

        this.context.fillRect(x, y, 1, 1);
      }
    }
  }

  private resizeBackingStore(buffer: DisplayBuffer): void {
    if (this.canvas.width === buffer.width && this.canvas.height === buffer.height) {
      return;
    }

    this.canvas.width = buffer.width;
    this.canvas.height = buffer.height;
  }
}
