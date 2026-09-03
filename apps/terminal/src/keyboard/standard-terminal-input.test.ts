import { assertEquals } from "@std/assert";
import { key, KeyboardState } from "@chip8nx/core";
import type { TerminalOutput } from "../display/terminal-output.ts";
import { StandardTerminalInput } from "./standard-terminal-input.ts";
import type { TerminalInput } from "./terminal-input.ts";

const encoder = new TextEncoder();

Deno.test("StandardTerminalInput provides the standard keyboard composition", async () => {
  const input = new ControlledTerminalInput();
  const output = new RecordingTerminalOutput();
  const keyboard = new KeyboardState();

  const terminalInput = new StandardTerminalInput(keyboard, output, {
    input,
  });

  const inputTask = terminalInput.start();

  input.enqueue(encoder.encode("q"));

  await nextTask();

  assertEquals(keyboard.isPressed(key(0x4)), true);

  input.enqueue(new Uint8Array([0x03]));

  await inputTask;

  assertEquals(terminalInput.quitRequested, true);

  await terminalInput.stop();

  assertEquals(keyboard.isPressed(key(0x4)), false);

  assertEquals(input.rawStates, [true, false]);
});

Deno.test(
  "StandardTerminalInput supports custom key mapping without manual input composition",
  async () => {
    const input = new ControlledTerminalInput();
    const output = new RecordingTerminalOutput();
    const keyboard = new KeyboardState();

    const terminalInput = new StandardTerminalInput(keyboard, output, {
      input,
      mapKey: (character) => (character === "p" ? key(0xa) : undefined),
    });

    const inputTask = terminalInput.start();

    input.enqueue(encoder.encode("p"));

    await nextTask();

    assertEquals(keyboard.isPressed(key(0xa)), true);

    input.enqueue(new Uint8Array([0x03]));

    await inputTask;
    await terminalInput.stop();
  },
);

Deno.test("StandardTerminalInput can customize legacy release timing", async () => {
  const input = new ControlledTerminalInput();
  const output = new RecordingTerminalOutput();
  const keyboard = new KeyboardState();

  const terminalInput = new StandardTerminalInput(keyboard, output, {
    input,
    legacyReleaseDelayMs: 0,
  });

  const inputTask = terminalInput.start();

  input.enqueue(encoder.encode("q"));

  await nextTask();

  assertEquals(keyboard.isPressed(key(0x4)), true);

  terminalInput.tick();

  assertEquals(keyboard.isPressed(key(0x4)), false);

  input.enqueue(new Uint8Array([0x03]));

  await inputTask;
  await terminalInput.stop();
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
