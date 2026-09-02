import { assertEquals } from "@std/assert";
import { DisplayBuffer } from "@chip8nx/core";
import { TerminalDisplay } from "./terminal-display.ts";
import type { TerminalOutput } from "./terminal-output.ts";

const CLEAR_SCREEN = "\x1b[2J";
const CURSOR_HOME = "\x1b[H";

Deno.test("TerminalDisplay renders all vertical pixel combinations", () => {
  const buffer = new DisplayBuffer(4, 2);

  // Column 0: off / off -> space
  // Column 1: on  / off -> upper half block
  // Column 2: off / on  -> lower half block
  // Column 3: on  / on  -> full block
  buffer.setPixel(1, 0, true);
  buffer.setPixel(2, 1, true);
  buffer.setPixel(3, 0, true);
  buffer.setPixel(3, 1, true);

  const output = new RecordingTerminalOutput();
  const display = new TerminalDisplay(output);

  display.render(buffer);

  assertEquals(output.writes, [CLEAR_SCREEN + CURSOR_HOME + " ▀▄█"]);
});

Deno.test("TerminalDisplay preserves column and row ordering", () => {
  const buffer = new DisplayBuffer(2, 4);

  buffer.setPixel(0, 0, true);
  buffer.setPixel(1, 1, true);

  buffer.setPixel(0, 2, true);
  buffer.setPixel(0, 3, true);

  const output = new RecordingTerminalOutput();
  const display = new TerminalDisplay(output);

  display.render(buffer);

  assertEquals(output.writes, [CLEAR_SCREEN + CURSOR_HOME + "▀▄\n█ "]);
});

Deno.test("TerminalDisplay treats a missing lower pixel as off for odd heights", () => {
  const buffer = new DisplayBuffer(2, 3);

  buffer.setPixel(0, 2, true);

  const output = new RecordingTerminalOutput();
  const display = new TerminalDisplay(output);

  display.render(buffer);

  assertEquals(output.writes, [CLEAR_SCREEN + CURSOR_HOME + "  \n▀ "]);
});

Deno.test("TerminalDisplay clears only the first frame and homes later frames", () => {
  const buffer = new DisplayBuffer(1, 2);

  const output = new RecordingTerminalOutput();
  const display = new TerminalDisplay(output);

  display.render(buffer);

  buffer.setPixel(0, 0, true);

  display.render(buffer);

  assertEquals(output.writes, [CLEAR_SCREEN + CURSOR_HOME + " ", CURSOR_HOME + "▀"]);
});

class RecordingTerminalOutput implements TerminalOutput {
  public readonly writes: string[] = [];

  public write(text: string): void {
    this.writes.push(text);
  }
}
