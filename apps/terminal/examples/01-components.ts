/**
 * Level 1 — Component-by-component terminal composition.
 *
 * This example assembles the terminal application from its individual parts
 * to demonstrate the maximum-control path.
 *
 * Terminal assembly:
 *
 * - StdoutTerminalOutput
 * - TerminalDisplay
 * - TerminalScreenSession
 * - StdinTerminalInput
 * - TerminalInputSession
 * - TerminalKeyEventParser
 * - TerminalKeyboard
 *
 * Use this level when an application needs to replace or customize individual
 * terminal components.
 *
 * @module
 */

import { TerminalDisplay } from "../src/display/terminal-display.ts";
import { TerminalScreenSession } from "../src/display/terminal-screen-session.ts";
import { StdoutTerminalOutput } from "../src/display/stdout-terminal-output.ts";
import { StdinTerminalInput } from "../src/keyboard/stdin-terminal-input.ts";
import { TerminalInputSession } from "../src/keyboard/terminal-input-session.ts";
import { TerminalKeyEventParser } from "../src/keyboard/terminal-key-event-parser.ts";
import { TerminalKeyboard } from "../src/keyboard/terminal-keyboard.ts";
import { createExampleMachine } from "./shared/classic-machine.ts";

const HOST_RENDER_INTERVAL_MS = 1_000 / 60;

const romPath = requireRomPath();
const machine = await createExampleMachine(romPath);

const output = new StdoutTerminalOutput();

const display = new TerminalDisplay(output);
const screen = new TerminalScreenSession(output);

const terminalKeyboard = new TerminalKeyboard(machine.keyboard);

const input = new TerminalInputSession(
  new StdinTerminalInput(),
  output,
  new TerminalKeyEventParser(),
  terminalKeyboard,
);

screen.start();

try {
  const inputTask = input.start();

  machine.runtime.resume();

  try {
    while (!input.quitRequested) {
      machine.runtime.tick();

      terminalKeyboard.tick();

      display.render(machine.displayBuffer);

      await sleep(HOST_RENDER_INTERVAL_MS);
    }
  } finally {
    await input.stop();
  }

  await inputTask;
} finally {
  screen.stop();
}

function requireRomPath(): string {
  const romPath = Deno.args[0];

  if (romPath === undefined || Deno.args.length !== 1) {
    console.error("Usage: deno task terminal:example:components <rom-path>");

    Deno.exit(1);
  }

  return romPath;
}

function sleep(milliseconds: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, milliseconds);
  });
}
