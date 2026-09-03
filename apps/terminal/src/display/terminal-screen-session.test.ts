import { assertEquals } from "@std/assert";
import { TerminalScreenSession } from "./terminal-screen-session.ts";
import type { TerminalOutput } from "./terminal-output.ts";

Deno.test("TerminalScreenSession enters and restores presentation mode", () => {
  const output = new RecordingTerminalOutput();
  const session = new TerminalScreenSession(output);

  session.start();

  assertEquals(output.writes, ["\x1b[?1049h\x1b[?25l\x1b[32m"]);

  session.stop();

  assertEquals(output.writes, ["\x1b[?1049h\x1b[?25l\x1b[32m", "\x1b[0m\x1b[?25h\x1b[?1049l"]);
});

Deno.test("TerminalScreenSession lifecycle is idempotent", () => {
  const output = new RecordingTerminalOutput();
  const session = new TerminalScreenSession(output);

  session.start();
  session.start();

  session.stop();
  session.stop();

  assertEquals(output.writes, ["\x1b[?1049h\x1b[?25l\x1b[32m", "\x1b[0m\x1b[?25h\x1b[?1049l"]);
});

class RecordingTerminalOutput implements TerminalOutput {
  public readonly writes: string[] = [];

  public write(text: string): void {
    this.writes.push(text);
  }
}
