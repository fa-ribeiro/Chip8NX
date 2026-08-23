import type { DisplayBuffer } from "./display-buffer.ts";

/**
 * Presents the current state of a {@link DisplayBuffer}.
 *
 * A Display is a presentation boundary. It does not own the graphical state
 * and does not determine how that state is produced.
 *
 * Implementations may render the buffer to different targets, such as:
 *
 * - a terminal;
 * - an HTML canvas;
 * - a desktop window;
 * - a debugging UI;
 * - nowhere, for headless execution.
 *
 * Multiple Display implementations may consume the same DisplayBuffer.
 */
export interface Display {
  /**
   * Presents the current contents of the display buffer.
   *
   * @param buffer - Graphical state to present.
   */
  render(buffer: DisplayBuffer): void;
}
