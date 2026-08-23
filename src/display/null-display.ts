import type { DisplayBuffer } from "./display-buffer.ts";
import type { Display } from "./display.ts";

/**
 * A Display implementation that intentionally produces no output.
 *
 * NullDisplay is useful when the emulator is running without a presentation
 * target, such as in automated tests, benchmarks, or headless execution.
 *
 * It also provides a concrete implementation of the Display contract
 * without introducing a dependency on a terminal, browser, or desktop UI.
 */
export class NullDisplay implements Display {
  /**
   * Presents the display state without producing any output.
   *
   * @param _buffer - Display state that is intentionally ignored.
   */
  public render(_buffer: DisplayBuffer): void {
    // Intentionally empty.
  }
}
