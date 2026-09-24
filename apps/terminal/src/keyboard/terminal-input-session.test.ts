import { assertEquals, assertRejects } from "@std/assert";
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
  const terminalKeyboard = new TerminalKeyboard(keyboardState, {
    now: () => 0,
  });

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

Deno.test("TerminalInputSession restores terminal state when startup fails", async () => {
  const input = new ControlledTerminalInput();
  const output = new FailOnceTerminalOutput();

  const session = new TerminalInputSession(
    input,
    output,
    new TerminalKeyEventParser(),
    new TerminalKeyboard(new KeyboardState()),
  );

  await assertRejects(() => session.start(), Error, "terminal write failed");

  assertEquals(input.rawStates, [true, false]);
  assertEquals(output.writes, ["\x1b[>10u", "\x1b[<u"]);
});

Deno.test("TerminalInputSession restores terminal state when reading fails", async () => {
  const input = new ControlledTerminalInput();
  const output = new RecordingTerminalOutput();

  const session = new TerminalInputSession(
    input,
    output,
    new TerminalKeyEventParser(),
    new TerminalKeyboard(new KeyboardState()),
  );

  const inputTask = session.start();

  input.fail(new Error("read failed"));

  await assertRejects(() => inputTask, Error, "read failed");

  assertEquals(session.quitRequested, true);
  assertEquals(input.readable.locked, false);
  assertEquals(output.writes, ["\x1b[>10u", "\x1b[<u"]);
  assertEquals(input.rawStates, [true, false]);
});

Deno.test(
  "TerminalInputSession attempts all cleanup when reader cancellation fails",
  async () => {
    const input = new ControlledTerminalInput(true, new Error("cancel failed"));
    const output = new RecordingTerminalOutput();

    const session = new TerminalInputSession(
      input,
      output,
      new TerminalKeyEventParser(),
      new TerminalKeyboard(new KeyboardState()),
    );

    const inputTask = session.start();

    input.enqueue(new Uint8Array([0x03]));

    await inputTask;

    await assertRejects(() => session.stop(), Error, "cancel failed");

    assertEquals(input.readable.locked, false);
    assertEquals(output.writes, ["\x1b[>10u", "\x1b[<u"]);
    assertEquals(input.rawStates, [true, false]);
  },
);

class ControlledTerminalInput implements TerminalInput {
  public readonly rawStates: boolean[] = [];

  private controller: ReadableStreamDefaultController<Uint8Array> | undefined;

  public readonly readable: ReadableStream<Uint8Array>;

  public constructor(
    private readonly terminal = true,
    cancelError?: Error,
  ) {
    this.readable = new ReadableStream<Uint8Array>({
      start: (controller) => {
        this.controller = controller;
      },
      cancel: () => {
        if (cancelError !== undefined) {
          throw cancelError;
        }
      },
    });
  }

  public isTerminal(): boolean {
    return this.terminal;
  }

  public setRaw(enabled: boolean): void {
    this.rawStates.push(enabled);
  }

  public enqueue(bytes: Uint8Array): void {
    this.controller?.enqueue(bytes);
  }

  public fail(error: Error): void {
    this.controller?.error(error);
  }
}

class RecordingTerminalOutput implements TerminalOutput {
  public readonly writes: string[] = [];

  public write(text: string): void {
    this.writes.push(text);
  }
}

class FailOnceTerminalOutput implements TerminalOutput {
  public readonly writes: string[] = [];

  private shouldFail = true;

  public write(text: string): void {
    this.writes.push(text);

    if (this.shouldFail) {
      this.shouldFail = false;
      throw new Error("terminal write failed");
    }
  }
}

function nextTask(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, 0));
}

Deno.test("TerminalInputSession exits when Escape is pressed", async () => {
  const input = new ControlledTerminalInput();
  const output = new RecordingTerminalOutput();

  const session = new TerminalInputSession(
    input,
    output,
    new TerminalKeyEventParser(),
    new TerminalKeyboard(new KeyboardState()),
  );

  const inputTask = session.start();

  /*
   * CSI-u:
   *
   * 27   = Escape
   * 1    = no modifiers
   * :1   = press event
   */
  input.enqueue(encoder.encode("\x1b[27;1:1u"));

  await inputTask;

  assertEquals(session.quitRequested, true);

  await session.stop();

  assertEquals(output.writes, ["\x1b[>10u", "\x1b[<u"]);

  assertEquals(input.rawStates, [true, false]);
});
