/**
 * Level 2 — Standard terminal subsystem compositions.
 *
 * This example uses known-good display and input compositions while retaining
 * the option to customize either subsystem independently.
 *
 * Terminal assembly:
 *
 * - StdoutTerminalOutput
 * - StandardTerminalPresentation
 * - StandardTerminalInput
 *
 * Use this level when the standard terminal behavior is mostly suitable but
 * one or more meaningful subsystem policies, such as rendering or key mapping,
 * need customization.
 *
 * @module
 */

import { StandardTerminalPresentation } from "../src/display/standard-terminal-presentation.ts";
import { StdoutTerminalOutput } from "../src/display/stdout-terminal-output.ts";
import { StandardTerminalInput } from "../src/keyboard/standard-terminal-input.ts";
import { createExampleMachine } from "./shared/classic-machine.ts";

const HOST_RENDER_INTERVAL_MS = 1_000 / 60;

const romPath = requireRomPath();
const machine = await createExampleMachine(romPath);

const output = new StdoutTerminalOutput();

const presentation = new StandardTerminalPresentation({
  output,
});

const input = new StandardTerminalInput(machine.keyboard, output);

presentation.start();

try {
  const inputTask = input.start();

  machine.runtime.resume();

  try {
    while (!input.quitRequested) {
      machine.runtime.tick();

      input.tick();

      presentation.render(machine.displayBuffer);

      await sleep(HOST_RENDER_INTERVAL_MS);
    }
  } finally {
    await input.stop();
  }

  await inputTask;
} finally {
  presentation.stop();
}

function requireRomPath(): string {
  const romPath = Deno.args[0];

  if (romPath === undefined || Deno.args.length !== 1) {
    console.error("Usage: deno task terminal:example:standard <rom-path>");

    Deno.exit(1);
  }

  return romPath;
}

function sleep(milliseconds: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, milliseconds);
  });
}
