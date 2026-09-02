import type { TerminalInput } from "./terminal-input.ts";

/**
 * Terminal input backed by the process standard-input stream.
 */
export class StdinTerminalInput implements TerminalInput {
  public get readable(): ReadableStream<Uint8Array> {
    return Deno.stdin.readable;
  }

  public isTerminal(): boolean {
    return Deno.stdin.isTerminal();
  }

  public setRaw(enabled: boolean): void {
    Deno.stdin.setRaw(enabled);
  }
}
