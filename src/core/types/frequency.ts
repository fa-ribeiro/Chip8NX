/**
 * Represents a positive frequency as an exact rational number.
 *
 * @remarks
 * Frequencies are represented as `numerator / denominator` rather than
 * floating-point numbers so that the scheduler can perform exact timing
 * calculations without accumulating floating-point rounding errors.
 *
 * For example:
 *
 *     60 Hz   = 60 / 1
 *     59.94 Hz = 2997 / 50
 */
export class Frequency {
  /**
   * Creates a frequency.
   *
   * @param numerator - Numerator of the frequency.
   * @param denominator - Denominator of the frequency.
   */
  public constructor(
    public readonly numerator: bigint,
    public readonly denominator: bigint = 1n,
  ) {
    if (numerator <= 0n) {
      throw new RangeError("Frequency numerator must be positive.");
    }

    if (denominator <= 0n) {
      throw new RangeError("Frequency denominator must be positive.");
    }
  }

  /**
   * Creates an integer frequency.
   *
   * @param value - Frequency in executions per second.
   */
  public static fromInteger(value: bigint): Frequency {
    return new Frequency(value);
  }
}
