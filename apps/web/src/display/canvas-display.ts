import { type Display, DisplayBuffer } from "@chip8nx/core";

export interface CanvasDisplayPalette {
  readonly background: string;
  readonly foreground: string;
}

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

  private palette: CanvasDisplayPalette;

  public constructor(
    private readonly canvas: HTMLCanvasElement,
    palette: CanvasDisplayPalette,
  ) {
    const context = canvas.getContext("2d");

    if (context === null) {
      throw new Error("Canvas 2D rendering context is unavailable.");
    }

    this.context = context;
    this.palette = palette;
  }

  /**
   * Changes the presentation palette used by future renders.
   *
   * This affects only browser presentation. It does not alter the
   * underlying CHIP-8 DisplayBuffer.
   */
  public setPalette(palette: CanvasDisplayPalette): void {
    this.palette = palette;
  }

  /**
   * Presents the current CHIP-8 framebuffer.
   */
  public render(buffer: DisplayBuffer): void {
    this.resizeBackingStore(buffer);

    this.context.fillStyle = this.palette.background;

    this.context.fillRect(0, 0, buffer.width, buffer.height);

    this.context.fillStyle = this.palette.foreground;

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
