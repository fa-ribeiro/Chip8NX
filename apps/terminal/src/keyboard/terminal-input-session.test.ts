import { assertEquals } from "@std/assert";
import { key, KeyboardState } from "@chip8nx/core";
import type { TerminalOutput } from "../display/terminal-output.ts";
import type { TerminalInput } from "./terminal-input.ts";
import { TerminalInputSession } from "./terminal-input-session.ts";
import { TerminalKeyEventParser } from "./terminal-key-event-parser.ts";
import { TerminalKeyboard } from "./terminal-keyboard.ts";

const encoder = new TextEncoder();

Deno.test("TerminalInputSession manages terminal lifecycle and keyboard input", async () => {
  const input = new ControlledTerminalInput();
  const output = new RecordingTerminalOutput();

  const keyboardState = new KeyboardState();
  const terminalKeyboard = new TerminalKeyboard(keyboardState, () => 0);

  const session = new TerminalInputSession(
    input,
    output,
    new TerminalKeyEventParser(),
    terminalKeyboard,
  );

  const inputTask = session.start();

  assertEquals(input.rawStates, [true]);
  assertEquals(output.writes, ["\x1b[>10u"]);

  input.enqueue(encoder.encode("q"));

  await nextTask();

  assertEquals(keyboardState.isPressed(key(0x4)), true);

  input.enqueue(new Uint8Array([0x03]));

  await inputTask;

  assertEquals(session.quitRequested, true);

  await session.stop();

  assertEquals(keyboardState.isPressed(key(0x4)), false);

  assertEquals(output.writes, ["\x1b[>10u", "\x1b[<u"]);

  assertEquals(input.rawStates, [true, false]);
});

Deno.test("TerminalInputSession does nothing when stdin is not a terminal", async () => {
  const input = new ControlledTerminalInput(false);
  const output = new RecordingTerminalOutput();

  const session = new TerminalInputSession(
    input,
    output,
    new TerminalKeyEventParser(),
    new TerminalKeyboard(new KeyboardState()),
  );

  await session.start();
  await session.stop();

  assertEquals(input.rawStates, []);
  assertEquals(output.writes, []);
});

class ControlledTerminalInput implements TerminalInput {
  public readonly rawStates: boolean[] = [];

  private controller: ReadableStreamDefaultController<Uint8Array> | undefined;

  public readonly readable = new ReadableStream<Uint8Array>({
    start: (controller) => {
      this.controller = controller;
    },
  });

  public constructor(private readonly terminal = true) {}

  public isTerminal(): boolean {
    return this.terminal;
  }

  public setRaw(enabled: boolean): void {
    this.rawStates.push(enabled);
  }

  public enqueue(bytes: Uint8Array): void {
    this.controller?.enqueue(bytes);
  }
}

class RecordingTerminalOutput implements TerminalOutput {
  public readonly writes: string[] = [];

  public write(text: string): void {
    this.writes.push(text);
  }
}

function nextTask(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, 0));
}
