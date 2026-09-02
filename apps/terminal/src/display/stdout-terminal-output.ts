import type { TerminalOutput } from "./terminal-output.ts";

/**
 * Writes terminal presentation data to the process standard output stream.
 */
export class StdoutTerminalOutput implements TerminalOutput {
  private readonly encoder = new TextEncoder();

  /**
   * Writes text directly to standard output without adding formatting or line
   * endings.
   *
   * @param text - Terminal text and control sequences to write.
   */
  public write(text: string): void {
    Deno.stdout.writeSync(this.encoder.encode(text));
  }
}
