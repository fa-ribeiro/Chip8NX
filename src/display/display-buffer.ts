import { Byte } from "../core/types/byte.ts";

/**
 * Represents the graphical state of a CHIP-8 display.
 *
 * The buffer stores one boolean state for each pixel:
 *
 * - `false` — pixel is off.
 * - `true` — pixel is on.
 *
 * The buffer is deliberately independent from any rendering technology.
 * It does not know whether its contents will eventually be displayed in a
 * terminal, HTML canvas, desktop window, or nowhere at all.
 *
 * @remarks
 * Coordinates are zero-based. The valid horizontal range is
 * `0 <= x < width`, and the valid vertical range is `0 <= y < height`.
 *
 * Coordinates supplied to {@link getPixel} and {@link setPixel} must be
 * within the buffer bounds.
 *
 * Sprite drawing through {@link drawSprite} has its own semantics: the
 * initial sprite coordinates are wrapped to the display dimensions, while
 * sprite pixels extending beyond the right or bottom edges are clipped.
 */
export class DisplayBuffer {
  /**
   * The horizontal number of pixels.
   */
  public readonly width: number;

  /**
   * The vertical number of pixels.
   */
  public readonly height: number;

  /**
   * Pixel storage in row-major order.
   *
   * A pixel at `(x, y)` is stored at:
   *
   * `y * width + x`
   *
   * One byte is used per pixel even though a pixel has only two possible
   * states. This keeps the representation simple and efficient while
   * allowing straightforward access to the underlying storage later if
   * needed by a renderer.
   */
  private readonly pixels: Uint8Array;

  /**
   * Creates a display buffer with the specified dimensions.
   *
   * All pixels are initially off.
   *
   * @param width - Number of horizontal pixels.
   * @param height - Number of vertical pixels.
   *
   * @throws {@link RangeError}
   * Thrown when either dimension is not a positive integer.
   */
  constructor(width: number, height: number) {
    if (!Number.isInteger(width) || width <= 0) {
      throw new RangeError(
        `Invalid display width: ${width}. ` + `Expected a positive integer.`,
      );
    }

    if (!Number.isInteger(height) || height <= 0) {
      throw new RangeError(
        `Invalid display height: ${height}. ` + `Expected a positive integer.`,
      );
    }

    this.width = width;
    this.height = height;
    this.pixels = new Uint8Array(width * height);
  }

  /**
   * Returns the state of a pixel.
   *
   * @param x - Horizontal coordinate, starting at zero.
   * @param y - Vertical coordinate, starting at zero.
   * @returns `true` when the pixel is on; otherwise `false`.
   *
   * @throws {@link RangeError}
   * Thrown when the coordinates are outside the buffer.
   */
  public getPixel(x: number, y: number): boolean {
    return this.pixels[this.getIndex(x, y)] !== 0;
  }

  /**
   * Sets the state of a pixel.
   *
   * @param x - Horizontal coordinate, starting at zero.
   * @param y - Vertical coordinate, starting at zero.
   * @param value - Whether the pixel should be on.
   *
   * @throws {@link RangeError}
   * Thrown when the coordinates are outside the buffer.
   */
  public setPixel(x: number, y: number, value: boolean): void {
    this.pixels[this.getIndex(x, y)] = value ? 1 : 0;
  }

  /**
   * Turns all pixels off.
   *
   * This operation represents the CHIP-8 display clear operation without
   * coupling the buffer to a particular CHIP-8 instruction.
   */
  public clear(): void {
    this.pixels.fill(0);
  }

  /**
   * Converts a two-dimensional coordinate into the corresponding storage
   * index.
   *
   * Keeping this calculation in one place prevents `getPixel()` and
   * `setPixel()` from accidentally using different coordinate semantics.
   *
   * @param x - Horizontal coordinate.
   * @param y - Vertical coordinate.
   * @returns The corresponding index in the pixel storage.
   *
   * @throws {@link RangeError}
   * Thrown when the coordinates are outside the buffer.
   */
  private getIndex(x: number, y: number): number {
    if (!Number.isInteger(x) || x < 0 || x >= this.width) {
      throw new RangeError(
        `Invalid display X coordinate: ${x}. ` +
          `Expected an integer between 0 and ${this.width - 1}.`,
      );
    }

    if (!Number.isInteger(y) || y < 0 || y >= this.height) {
      throw new RangeError(
        `Invalid display Y coordinate: ${y}. ` +
          `Expected an integer between 0 and ${this.height - 1}.`,
      );
    }

    return y * this.width + x;
  }

  public drawSprite(x: number, y: number, sprite: readonly Byte[]): boolean {
    const originX = x % this.width;
    const originY = y % this.height;

    let collision = false;

    for (const [row, spriteByte] of sprite.entries()) {
      const targetY = originY + row;

      if (targetY >= this.height) {
        break;
      }

      for (let bit = 0; bit < 8; bit++) {
        const targetX = originX + bit;

        if (targetX >= this.width) {
          break;
        }

        const spritePixel = ((spriteByte as Byte) & (0x80 >> bit)) !== 0;

        if (!spritePixel) {
          continue;
        }

        const currentPixel = this.getPixel(targetX, targetY);

        if (currentPixel) {
          collision = true;
        }

        this.setPixel(targetX, targetY, !currentPixel);
      }
    }

    return collision;
  }
}
