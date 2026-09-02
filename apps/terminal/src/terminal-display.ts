import type { Display, DisplayBuffer } from "@chip8nx/core";

import type { TerminalOutput } from "./terminal-output.ts";

const CLEAR_SCREEN = "\x1b[2J";
const CURSOR_HOME = "\x1b[H";

const EMPTY_PIXEL_PAIR = " ";
const UPPER_PIXEL = "▀";
const LOWER_PIXEL = "▄";
const FULL_PIXEL_PAIR = "█";

/**
 * Presents a CHIP-8 display buffer in a character-cell terminal.
 *
 * Two vertically adjacent CHIP-8 pixels are packed into one terminal cell:
 *
 * - both off: space
 * - upper on: `▀`
 * - lower on: `▄`
 * - both on: `█`
 *
 * This preserves the framebuffer width while halving its terminal height.
 * A 64×32 Classic CHIP-8 display therefore occupies 64×16 terminal cells.
 *
 * TerminalDisplay owns presentation only. It does not control emulated
 * display timing, runtime execution, or host render frequency.
 */
export class TerminalDisplay implements Display {
  private hasRendered = false;

  public constructor(private readonly output: TerminalOutput) {}

  /**
   * Presents the current framebuffer as a complete terminal frame.
   *
   * The terminal is cleared before the first frame. Later frames return the
   * cursor to the top-left corner and overwrite the existing frame.
   *
   * @param buffer - CHIP-8 graphical state to present.
   */
  public render(buffer: DisplayBuffer): void {
    const prefix = this.hasRendered ? CURSOR_HOME : CLEAR_SCREEN + CURSOR_HOME;

    this.output.write(prefix + this.createFrame(buffer));

    this.hasRendered = true;
  }

  /**
   * Converts the framebuffer into terminal character cells.
   *
   * An unmatched final row in an odd-height buffer is treated as having an
   * inactive lower pixel.
   */
  private createFrame(buffer: DisplayBuffer): string {
    const rows: string[] = [];

    for (let y = 0; y < buffer.height; y += 2) {
      let row = "";

      for (let x = 0; x < buffer.width; x++) {
        const upper = buffer.getPixel(x, y);
        const lower = y + 1 < buffer.height ? buffer.getPixel(x, y + 1) : false;

        row += this.pixelPairToCharacter(upper, lower);
      }

      rows.push(row);
    }

    return rows.join("\n");
  }

  private pixelPairToCharacter(upper: boolean, lower: boolean): string {
    if (upper && lower) {
      return FULL_PIXEL_PAIR;
    }

    if (upper) {
      return UPPER_PIXEL;
    }

    if (lower) {
      return LOWER_PIXEL;
    }

    return EMPTY_PIXEL_PAIR;
  }
}
