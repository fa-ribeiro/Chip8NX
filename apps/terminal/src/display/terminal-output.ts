/**
 * Writes terminal presentation data to an output target.
 *
 * This boundary keeps terminal rendering independent from the concrete output
 * destination so it can be tested without writing to the process terminal.
 */
export interface TerminalOutput {
  /**
   * Writes text exactly as supplied.
   *
   * @param text - Terminal text and control sequences to write.
   */
  write(text: string): void;
}
