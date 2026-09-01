/**
 * Models the availability of a CHIP-8 vertical-blank interval.
 *
 * A vertical blank is an opportunity to perform a display-synchronized draw,
 * not an accumulated resource. Multiple signals before a consume therefore
 * still represent only one pending opportunity.
 */
export class VerticalBlank {
  private pending = false;

  /**
   * Returns whether a vertical-blank opportunity is currently pending.
   */
  public get isPending(): boolean {
    return this.pending;
  }

  /**
   * Marks a vertical-blank interval as available.
   */
  public signal(): void {
    this.pending = true;
  }

  /**
   * Consumes a pending vertical-blank interval.
   *
   * Returns `true` when one was available, otherwise `false`.
   */
  public consume(): boolean {
    if (!this.pending) {
      return false;
    }

    this.pending = false;

    return true;
  }

  /**
   * Discards any pending vertical-blank interval.
   */
  public reset(): void {
    this.pending = false;
  }
}
