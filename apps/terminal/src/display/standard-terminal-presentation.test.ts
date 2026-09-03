import { assertEquals } from "@std/assert";
import { type Display, DisplayBuffer } from "@chip8nx/core";
import { StandardTerminalPresentation } from "./standard-terminal-presentation.ts";
import type { TerminalOutput } from "./terminal-output.ts";

Deno.test("StandardTerminalPresentation provides the standard display composition", () => {
  const output = new RecordingTerminalOutput();
  const presentation = new StandardTerminalPresentation({
    output,
  });

  const buffer = new DisplayBuffer(2, 2);

  buffer.setPixel(0, 0, true);
  buffer.setPixel(1, 1, true);

  presentation.start();
  presentation.render(buffer);
  presentation.stop();

  assertEquals(output.writes, [
    "\x1b[?1049h\x1b[?25l\x1b[32m",
    "\x1b[2J\x1b[H▀▄",
    "\x1b[0m\x1b[?25h\x1b[?1049l",
  ]);
});

Deno.test(
  "StandardTerminalPresentation supports a custom renderer with standard lifecycle",
  () => {
    const output = new RecordingTerminalOutput();
    const customDisplay = new RecordingDisplay();

    const presentation = new StandardTerminalPresentation({
      output,
      createDisplay: (receivedOutput) => {
        assertEquals(receivedOutput, output);

        return customDisplay;
      },
    });

    const buffer = new DisplayBuffer(2, 2);

    presentation.start();
    presentation.render(buffer);
    presentation.stop();

    assertEquals(customDisplay.renderedBuffers, [buffer]);

    assertEquals(output.writes, [
      "\x1b[?1049h\x1b[?25l\x1b[32m",
      "\x1b[0m\x1b[?25h\x1b[?1049l",
    ]);
  },
);

class RecordingTerminalOutput implements TerminalOutput {
  public readonly writes: string[] = [];

  public write(text: string): void {
    this.writes.push(text);
  }
}

class RecordingDisplay implements Display {
  public readonly renderedBuffers: DisplayBuffer[] = [];

  public render(buffer: DisplayBuffer): void {
    this.renderedBuffers.push(buffer);
  }
}
