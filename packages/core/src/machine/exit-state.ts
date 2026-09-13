/**
 * Tracks whether the emulated program has requested interpreter exit.
 */
export class ExitState {
  private exited = false;

  /**
   * Whether interpreter exit has been requested.
   */
  public get isExited(): boolean {
    return this.exited;
  }

  /**
   * Marks the emulated program as exited.
   */
  public exit(): void {
    this.exited = true;
  }

  /**
   * Restores the initial running state.
   */
  public reset(): void {
    this.exited = false;
  }
}
