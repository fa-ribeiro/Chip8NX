import { Byte } from "../core/types/byte.ts";
import type { DisplayMode, DisplaySpecification } from "./display-specification.ts";

/**
 * Selects how sprite pixels extending beyond display edges are handled.
 */
export type SpriteOverflowBehavior = "clip" | "wrap";

/**
 * Summarizes the observable result of drawing one sprite.
 */
export interface SpriteDrawResult {
  /**
   * Whether drawing erased at least one previously set pixel.
   */
  readonly collision: boolean;

  /**
   * Number of logical sprite rows containing at least one collision.
   */
  readonly collisionRows: number;

  /**
   * Number of logical sprite rows clipped below the bottom edge.
   */
  readonly clippedBottomRows: number;
}

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
 * Backing-framebuffer coordinates are zero-based. Coordinates supplied to
 * {@link getPixel} and {@link setPixel} must satisfy
 * `0 <= x < backingWidth` and `0 <= y < backingHeight`.
 *
 * Sprite drawing uses the current logical display dimensions, which may
 * differ from the backing dimensions for SUPER-CHIP low-resolution mode.
 *
 * Sprite drawing through {@link drawSprite} has its own semantics: the
 * initial sprite coordinates are wrapped to the display dimensions, while
 * sprite pixels extending beyond the right or bottom edges can be clipped
 * or wrapped according to configuration.
 */
export class DisplayBuffer {
  /**
   * Horizontal size of the backing framebuffer.
   */
  public readonly backingWidth: number;

  /**
   * Vertical size of the backing framebuffer.
   */
  public readonly backingHeight: number;

  private currentMode: DisplayMode | null;

  /**
   * Pixel storage in row-major order.
   *
   * A pixel at `(x, y)` is stored at:
   *
   * `y * backingWidth + x`
   *
   * One byte is used per pixel even though a pixel has only two possible
   * states. This keeps the representation simple and efficient while
   * allowing straightforward access to the underlying storage later if
   * needed by a renderer.
   */
  private readonly pixels: Uint8Array;

  /**
   * Creates a display buffer from an immutable display specification.
   *
   * All pixels are initially off. SUPER-CHIP displays begin in their
   * configured initial logical mode.
   *
   * @param specification - Display geometry and mode model.
   * @param spriteOverflow - Behavior when a sprite exceeds the display boundaries.
   *
   * @throws {@link RangeError}
   * Thrown when either display dimension is not a positive integer.
   */
  constructor(
    private readonly specification: DisplaySpecification,
    private readonly spriteOverflow: SpriteOverflowBehavior,
  ) {
    if (specification.kind === "fixed") {
      this.validateDimension("width", specification.width);
      this.validateDimension("height", specification.height);

      this.backingWidth = specification.width;
      this.backingHeight = specification.height;
      this.currentMode = null;
    } else {
      this.validateDimension("backing width", specification.backingWidth);
      this.validateDimension("backing height", specification.backingHeight);

      if (specification.backingWidth % 2 !== 0 || specification.backingHeight % 2 !== 0) {
        throw new RangeError(
          "SUPER-CHIP backing dimensions must be even so low-resolution " +
            "pixels can map to 2×2 backing blocks.",
        );
      }

      this.backingWidth = specification.backingWidth;
      this.backingHeight = specification.backingHeight;
      this.currentMode = specification.initialMode;
    }

    this.pixels = new Uint8Array(this.backingWidth * this.backingHeight);
  }

  /**
   * Current logical horizontal display resolution.
   */
  public get width(): number {
    if (this.specification.kind === "fixed") {
      return this.specification.width;
    }

    return this.currentMode === "low" ? this.backingWidth / 2 : this.backingWidth;
  }

  /**
   * Current logical vertical display resolution.
   */
  public get height(): number {
    if (this.specification.kind === "fixed") {
      return this.specification.height;
    }

    return this.currentMode === "low" ? this.backingHeight / 2 : this.backingHeight;
  }

  /**
   * Current logical display mode.
   *
   * Fixed-geometry displays do not have a switchable display mode and
   * therefore return `null`.
   */
  public get mode(): DisplayMode | null {
    return this.currentMode;
  }

  /**
   * Returns the state of a backing-framebuffer pixel.
   *
   * @param x - Horizontal backing-framebuffer coordinate, starting at zero.
   * @param y - Vertical backing-framebuffer coordinate, starting at zero.
   * @returns `true` when the pixel is on; otherwise `false`.
   *
   * @throws {@link RangeError}
   * Thrown when the coordinates are outside the backing framebuffer.
   */
  public getPixel(x: number, y: number): boolean {
    return this.pixels[this.getBackingIndex(x, y)] !== 0;
  }

  /**
   * Sets the state of a backing-framebuffer pixel.
   *
   * @param x - Horizontal backing-framebuffer coordinate, starting at zero.
   * @param y - Vertical backing-framebuffer coordinate, starting at zero.
   * @param value - `true` when the pixel is on; otherwise `false`.
   *
   * @throws {@link RangeError}
   * Thrown when the coordinates are outside the backing framebuffer.
   */
  public setPixel(x: number, y: number, value: boolean): void {
    this.pixels[this.getBackingIndex(x, y)] = value ? 1 : 0;
  }

  /**
   * Turns all pixels off.
   *
   * This operation represents the CHIP-8 display clear operation without
   * coupling the backing framebuffer to a particular CHIP-8 instruction.
   */
  public clear(): void {
    this.pixels.fill(0);
  }

  /**
   * Changes the logical resolution mode of a SUPER-CHIP display.
   *
   * Changing modes does not clear or transform the backing framebuffer.
   *
   * @param mode - Logical resolution mode to activate.
   *
   * @throws {@link Error}
   * Thrown when the display has fixed geometry and therefore has no
   * switchable resolution mode.
   */
  public setMode(mode: DisplayMode): void {
    if (this.specification.kind === "fixed") {
      throw new Error("Cannot change display mode on a fixed-geometry display.");
    }

    this.currentMode = mode;
  }

  /**
   * Restores the display to its initial machine state.
   *
   * The backing framebuffer is cleared. For SUPER-CHIP displays, the logical
   * resolution mode is restored to the configured initial mode.
   */
  public reset(): void {
    this.clear();

    if (this.specification.kind === "superchip") {
      this.currentMode = this.specification.initialMode;
    }
  }

  /**
   * Returns the storage index for a backing-framebuffer coordinate.
   *
   * @param x - Horizontal backing-framebuffer coordinate.
   * @param y - Vertical backing-framebuffer coordinate.
   * @returns The corresponding index in row-major pixel storage.
   *
   * @throws {@link RangeError}
   * Thrown when the coordinates are outside the backing framebuffer.
   */
  private getBackingIndex(x: number, y: number): number {
    if (!Number.isInteger(x) || x < 0 || x >= this.backingWidth) {
      throw new RangeError(
        `Invalid display X coordinate: ${x}. ` +
          `Expected an integer between 0 and ${this.backingWidth - 1}.`,
      );
    }

    if (!Number.isInteger(y) || y < 0 || y >= this.backingHeight) {
      throw new RangeError(
        `Invalid display Y coordinate: ${y}. ` +
          `Expected an integer between 0 and ${this.backingHeight - 1}.`,
      );
    }

    return y * this.backingWidth + x;
  }

  /**
   * Draws an 8-bit-wide sprite using XOR semantics.
   *
   * Each byte represents one logical sprite row.
   */
  public drawSprite(x: number, y: number, sprite: readonly Byte[]): SpriteDrawResult {
    return this.drawSpriteRows(
      x,
      y,
      sprite.length,
      8,
      (row, bit) => (this.getSpriteByte(sprite, row) & (0x80 >> bit)) !== 0,
    );
  }

  /**
   * Draws a 16-bit-wide sprite using XOR semantics.
   *
   * Each logical sprite row is represented by two consecutive bytes,
   * most-significant byte first.
   *
   * @throws {@link RangeError}
   * Thrown when the sprite contains an odd number of bytes.
   */
  public drawWideSprite(x: number, y: number, sprite: readonly Byte[]): SpriteDrawResult {
    if (sprite.length % 2 !== 0) {
      throw new RangeError(
        `Invalid wide sprite byte count: ${sprite.length}. ` +
          "Expected an even number of bytes.",
      );
    }

    const rowCount = sprite.length / 2;

    return this.drawSpriteRows(x, y, rowCount, 16, (row, bit) => {
      const byteIndex = row * 2;

      if (bit < 8) {
        return (this.getSpriteByte(sprite, byteIndex) & (0x80 >> bit)) !== 0;
      }

      return (this.getSpriteByte(sprite, byteIndex + 1) & (0x80 >> (bit - 8))) !== 0;
    });
  }

  private drawSpriteRows(
    x: number,
    y: number,
    rowCount: number,
    rowWidth: number,
    isPixelSet: (row: number, bit: number) => boolean,
  ): SpriteDrawResult {
    const originX = x % this.width;
    const originY = y % this.height;

    let collision = false;
    let collisionRows = 0;
    let clippedBottomRows = 0;

    for (let row = 0; row < rowCount; row++) {
      const unwrappedY = originY + row;

      if (this.spriteOverflow === "clip" && unwrappedY >= this.height) {
        clippedBottomRows = rowCount - row;
        break;
      }

      const targetY = unwrappedY % this.height;
      let rowCollision = false;

      for (let bit = 0; bit < rowWidth; bit++) {
        const unwrappedX = originX + bit;

        if (this.spriteOverflow === "clip" && unwrappedX >= this.width) {
          break;
        }

        if (!isPixelSet(row, bit)) {
          continue;
        }

        const targetX = unwrappedX % this.width;

        if (this.xorLogicalPixel(targetX, targetY)) {
          collision = true;
          rowCollision = true;
        }
      }

      if (rowCollision) {
        collisionRows++;
      }
    }

    return {
      collision,
      collisionRows,
      clippedBottomRows,
    };
  }

  /**
   * Returns one sprite byte at a validated index.
   *
   * @param sprite - Sprite byte sequence.
   * @param index - Byte index to read.
   * @returns The sprite byte at the requested index.
   *
   * @throws {@link RangeError}
   * Thrown when the index is outside the sprite data.
   */
  private getSpriteByte(sprite: readonly Byte[], index: number): Byte {
    const value = sprite[index];

    if (value === undefined) {
      throw new RangeError(
        `Invalid sprite byte index: ${index}. ` +
          `Expected an index between 0 and ${sprite.length - 1}.`,
      );
    }

    return value;
  }
  /**
   * Scrolls a SUPER-CHIP backing framebuffer downward by a number of physical rows.
   *
   * Pixels shifted beyond the bottom edge are discarded. Newly exposed rows
   * at the top are cleared.
   *
   * The amount is expressed in backing-framebuffer rows and is therefore
   * independent of the current logical display mode.
   *
   * @param rows - Number of backing-framebuffer rows to scroll.
   *
   * @throws {@link Error}
   * Thrown when the display has fixed geometry and does not support scrolling.
   *
   * @throws {@link RangeError}
   * Thrown when `rows` is not a non-negative integer.
   */
  public scrollDown(rows: number): void {
    if (this.specification.kind === "fixed") {
      throw new Error("Cannot scroll a fixed-geometry display.");
    }

    if (!Number.isInteger(rows) || rows < 0) {
      throw new RangeError(
        `Invalid scroll row count: ${rows}. Expected a non-negative integer.`,
      );
    }

    if (rows === 0) {
      return;
    }

    if (rows >= this.backingHeight) {
      this.clear();
      return;
    }

    const offset = rows * this.backingWidth;

    this.pixels.copyWithin(offset, 0, this.pixels.length - offset);

    this.pixels.fill(0, 0, offset);
  }

  /**
   * Scrolls a SUPER-CHIP backing framebuffer to the right by a number of
   * physical columns.
   *
   * Pixels shifted beyond the right edge are discarded. Newly exposed columns
   * at the left edge are cleared.
   *
   * The amount is expressed in backing-framebuffer columns and is therefore
   * independent of the current logical display mode.
   *
   * @param columns - Number of backing-framebuffer columns to scroll.
   *
   * @throws {@link Error}
   * Thrown when the display has fixed geometry and does not support scrolling.
   *
   * @throws {@link RangeError}
   * Thrown when `columns` is not a non-negative integer.
   */
  public scrollRight(columns: number): void {
    if (this.specification.kind === "fixed") {
      throw new Error("Cannot scroll a fixed-geometry display.");
    }

    if (!Number.isInteger(columns) || columns < 0) {
      throw new RangeError(
        `Invalid scroll column count: ${columns}. ` + "Expected a non-negative integer.",
      );
    }

    if (columns === 0) {
      return;
    }

    if (columns >= this.backingWidth) {
      this.clear();
      return;
    }

    for (let y = 0; y < this.backingHeight; y++) {
      const rowStart = y * this.backingWidth;
      const rowEnd = rowStart + this.backingWidth;

      this.pixels.copyWithin(rowStart + columns, rowStart, rowEnd - columns);

      this.pixels.fill(0, rowStart, rowStart + columns);
    }
  }

  /**
   * Scrolls a SUPER-CHIP backing framebuffer to the left by a number of
   * physical columns.
   *
   * Pixels shifted beyond the left edge are discarded. Newly exposed columns
   * at the right edge are cleared.
   *
   * The amount is expressed in backing-framebuffer columns and is therefore
   * independent of the current logical display mode.
   *
   * @param columns - Number of backing-framebuffer columns to scroll.
   *
   * @throws {@link Error}
   * Thrown when the display has fixed geometry and does not support scrolling.
   *
   * @throws {@link RangeError}
   * Thrown when `columns` is not a non-negative integer.
   */
  public scrollLeft(columns: number): void {
    if (this.specification.kind === "fixed") {
      throw new Error("Cannot scroll a fixed-geometry display.");
    }

    if (!Number.isInteger(columns) || columns < 0) {
      throw new RangeError(
        `Invalid scroll column count: ${columns}. ` + "Expected a non-negative integer.",
      );
    }

    if (columns === 0) {
      return;
    }

    if (columns >= this.backingWidth) {
      this.clear();
      return;
    }

    for (let y = 0; y < this.backingHeight; y++) {
      const rowStart = y * this.backingWidth;
      const rowEnd = rowStart + this.backingWidth;

      this.pixels.copyWithin(rowStart, rowStart + columns, rowEnd);

      this.pixels.fill(0, rowEnd - columns, rowEnd);
    }
  }

  /**
   * XORs one logical display pixel with the backing framebuffer.
   *
   * In SUPER-CHIP low-resolution mode, one logical pixel maps to a 2×2
   * block of backing pixels. Fixed displays and SUPER-CHIP high-resolution
   * mode use a one-to-one mapping.
   *
   * @param x - Logical horizontal coordinate.
   * @param y - Logical vertical coordinate.
   * @returns `true` when at least one backing pixel was erased.
   */
  private xorLogicalPixel(x: number, y: number): boolean {
    const scale = this.getLogicalPixelScale();

    const backingX = x * scale;
    const backingY = y * scale;

    let collision = false;

    for (let offsetY = 0; offsetY < scale; offsetY++) {
      for (let offsetX = 0; offsetX < scale; offsetX++) {
        const targetX = backingX + offsetX;
        const targetY = backingY + offsetY;

        const currentPixel = this.getPixel(targetX, targetY);

        if (currentPixel) {
          collision = true;
        }

        this.setPixel(targetX, targetY, !currentPixel);
      }
    }

    return collision;
  }

  /**
   * Returns the number of backing pixels represented by one logical pixel
   * along each display axis.
   */
  private getLogicalPixelScale(): 1 | 2 {
    if (this.specification.kind === "superchip" && this.currentMode === "low") {
      return 2;
    }

    return 1;
  }

  private validateDimension(name: string, value: number): void {
    if (!Number.isInteger(value) || value <= 0) {
      throw new RangeError(`Invalid display ${name}: ${value}. Expected a positive integer.`);
    }
  }
}
