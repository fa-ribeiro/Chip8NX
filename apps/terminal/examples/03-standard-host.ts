/**
 * Level 3 — Ready-to-use standard terminal host.
 *
 * This example delegates terminal assembly to StandardTerminalHost, which owns
 * the shared terminal resources and composes the standard presentation and
 * input subsystems.
 *
 * Terminal assembly:
 *
 * - StandardTerminalHost
 *   - StandardTerminalPresentation
 *   - StandardTerminalInput
 *
 * Use this level when the standard terminal configuration is sufficient and
 * the application should focus primarily on CHIP-8 execution.
 *
 * @module
 */

import { StandardTerminalHost } from "../src/standard-terminal-host.ts";
import { createExampleMachine } from "./shared/classic-machine.ts";

const HOST_RENDER_INTERVAL_MS = 1_000 / 60;

const romPath = requireRomPath();
const machine = await createExampleMachine(romPath);

const terminal = new StandardTerminalHost(machine.keyboard);

const inputTask = terminal.start();

machine.runtime.resume();

try {
  while (!terminal.quitRequested) {
    machine.runtime.tick();

    terminal.tick();

    terminal.render(machine.displayBuffer);

    await sleep(HOST_RENDER_INTERVAL_MS);
  }
} finally {
  await terminal.stop();
}

await inputTask;

function requireRomPath(): string {
  const romPath = Deno.args[0];

  if (romPath === undefined || Deno.args.length !== 1) {
    console.error("Usage: deno task terminal:example:host <rom-path>");

    Deno.exit(1);
  }

  return romPath;
}

function sleep(milliseconds: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, milliseconds);
  });
}
