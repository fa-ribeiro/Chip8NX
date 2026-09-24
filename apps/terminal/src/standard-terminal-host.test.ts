import { assertEquals, assertRejects } from "@std/assert";
import { DisplayBuffer, KeyboardState } from "@chip8nx/core";
import type { TerminalOutput } from "./display/terminal-output.ts";
import type { TerminalPresentation } from "./display/terminal-presentation.ts";
import { StandardTerminalHost } from "./standard-terminal-host.ts";
import type { TerminalInputController } from "./keyboard/terminal-input-controller.ts";

Deno.test(
  "StandardTerminalHost shares one output across input and presentation subsystems",
  () => {
    const keyboard = new KeyboardState();
    const output = new RecordingTerminalOutput();

    let presentationOutput: TerminalOutput | undefined;
    let inputOutput: TerminalOutput | undefined;
    let inputKeyboard: KeyboardState | undefined;

    new StandardTerminalHost(keyboard, {
      output,

      createPresentation: (receivedOutput) => {
        presentationOutput = receivedOutput;

        return new RecordingPresentation();
      },

      createInput: (receivedKeyboard, receivedOutput) => {
        inputKeyboard = receivedKeyboard;
        inputOutput = receivedOutput;

        return new RecordingInput();
      },
    });

    assertEquals(presentationOutput, output);
    assertEquals(inputOutput, output);
    assertEquals(inputKeyboard, keyboard);
  },
);

Deno.test("StandardTerminalHost coordinates subsystem lifecycle", async () => {
  const events: string[] = [];

  const presentation = new RecordingPresentation(events);
  const input = new RecordingInput(events);

  const host = new StandardTerminalHost(new KeyboardState(), {
    output: new RecordingTerminalOutput(),
    createPresentation: () => presentation,
    createInput: () => input,
  });

  const inputTask = host.start();

  host.tick();

  const buffer = new DisplayBuffer({ kind: "fixed", width: 2, height: 2 }, "clip");

  host.render(buffer);

  await host.stop();
  await inputTask;

  assertEquals(events, [
    "presentation:start",
    "input:start",
    "input:tick",
    "presentation:render",
    "input:stop",
    "presentation:stop",
  ]);

  assertEquals(presentation.renderedBuffers, [buffer]);
});

Deno.test("StandardTerminalHost exposes input quit state", () => {
  const input = new RecordingInput();

  const host = new StandardTerminalHost(new KeyboardState(), {
    output: new RecordingTerminalOutput(),
    createPresentation: () => new RecordingPresentation(),
    createInput: () => input,
  });

  assertEquals(host.quitRequested, false);

  input.quitRequested = true;

  assertEquals(host.quitRequested, true);
});

Deno.test("StandardTerminalHost restores host state when input start rejects", async () => {
  const events: string[] = [];

  const host = new StandardTerminalHost(new KeyboardState(), {
    output: new RecordingTerminalOutput(),
    createPresentation: () => new RecordingPresentation(events),
    createInput: () => new RejectingStartInput(events),
  });

  await assertRejects(() => host.start(), Error, "input start failed");

  assertEquals(events, [
    "presentation:start",
    "input:start",
    "input:stop",
    "presentation:stop",
  ]);

  await host.stop();

  assertEquals(events, [
    "presentation:start",
    "input:start",
    "input:stop",
    "presentation:stop",
  ]);
});

Deno.test("StandardTerminalHost restores presentation when input cleanup fails", async () => {
  const events: string[] = [];

  const host = new StandardTerminalHost(new KeyboardState(), {
    output: new RecordingTerminalOutput(),
    createPresentation: () => new RecordingPresentation(events),
    createInput: () => new FailingStopInput(events),
  });

  await host.start();

  await assertRejects(() => host.stop(), Error, "input stop failed");

  assertEquals(events, [
    "presentation:start",
    "input:start",
    "input:stop",
    "presentation:stop",
  ]);
});

class RecordingTerminalOutput implements TerminalOutput {
  public readonly writes: string[] = [];

  public write(text: string): void {
    this.writes.push(text);
  }
}

class RecordingPresentation implements TerminalPresentation {
  public readonly renderedBuffers: DisplayBuffer[] = [];

  public constructor(private readonly events?: string[]) {}

  public start(): void {
    this.events?.push("presentation:start");
  }

  public render(buffer: DisplayBuffer): void {
    this.events?.push("presentation:render");
    this.renderedBuffers.push(buffer);
  }

  public stop(): void {
    this.events?.push("presentation:stop");
  }
}

class RecordingInput implements TerminalInputController {
  public quitRequested = false;

  public constructor(private readonly events?: string[]) {}

  public start(): Promise<void> {
    this.events?.push("input:start");

    return Promise.resolve();
  }

  public tick(): void {
    this.events?.push("input:tick");
  }

  public stop(): Promise<void> {
    this.events?.push("input:stop");

    return Promise.resolve();
  }
}

class RejectingStartInput implements TerminalInputController {
  public readonly quitRequested = false;

  public constructor(private readonly events: string[]) {}

  public start(): Promise<void> {
    this.events.push("input:start");

    return Promise.reject(new Error("input start failed"));
  }

  public tick(): void {}

  public stop(): Promise<void> {
    this.events.push("input:stop");

    return Promise.resolve();
  }
}

class FailingStopInput implements TerminalInputController {
  public readonly quitRequested = false;

  public constructor(private readonly events: string[]) {}

  public start(): Promise<void> {
    this.events.push("input:start");

    return Promise.resolve();
  }

  public tick(): void {}

  public stop(): Promise<void> {
    this.events.push("input:stop");

    return Promise.reject(new Error("input stop failed"));
  }
}
