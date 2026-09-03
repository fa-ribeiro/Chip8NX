import type { Display } from "@chip8nx/core";
import type { TerminalOutput } from "./terminal-output.ts";

/**
 * Creates a terminal renderer using the output owned by a terminal
 * presentation composition.
 *
 * This allows applications to customize rendering while retaining the
 * standard terminal output and lifecycle.
 */
export type TerminalDisplayFactory = (output: TerminalOutput) => Display;
