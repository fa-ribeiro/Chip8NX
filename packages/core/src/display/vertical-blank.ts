/**
 * Models the availability of a CHIP-8 vertical-blank interval.
 *
 * A vertical blank is an opportunity to perform a display-synchronized draw,
 * not an accumulated resource. Multiple signals before a consume therefore
 * still represent only one pending opportunity.
 */
export class VerticalBlank {
  #pending = false;

  /**
   * Marks a vertical-blank interval as available.
   */
  signal(): void {
    this.#pending = true;
  }

  /**
   * Consumes a pending vertical-blank interval.
   *
   * Returns `true` when one was available, otherwise `false`.
   */
  consume(): boolean {
    if (!this.#pending) {
      return false;
    }

    this.#pending = false;

    return true;
  }

  /**
   * Discards any pending vertical-blank interval.
   */
  reset(): void {
    this.#pending = false;
  }
}
