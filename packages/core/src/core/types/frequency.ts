/**
 * Represents a positive frequency as an exact rational number.
 *
 * @remarks
 * Frequencies are represented as `numerator / denominator`.
 *
 * For example:
 *
 *     60 Hz   = 60 / 1
 *     59.94 Hz = 2997 / 50
 *
 * Exact rational representation is useful for the scheduler because
 * frequencies such as 59.94 Hz cannot be represented exactly by JavaScript's
 * binary floating-point `number` type.
 */
export class Frequency {
  public readonly numerator: bigint;
  public readonly denominator: bigint;

  /**
   * Creates a frequency from a rational value.
   *
   * @param numerator - Positive numerator.
   * @param denominator - Positive denominator.
   *
   * @throws {@link RangeError}
   * Thrown when either value is not positive.
   */
  public constructor(numerator: bigint, denominator: bigint = 1n) {
    if (numerator <= 0n) {
      throw new RangeError("Frequency numerator must be positive.");
    }

    if (denominator <= 0n) {
      throw new RangeError("Frequency denominator must be positive.");
    }

    const divisor = gcd(numerator, denominator);

    this.numerator = numerator / divisor;
    this.denominator = denominator / divisor;
  }

  /**
   * Creates a frequency expressed as an integer number of executions
   * per second.
   *
   * @param value - Positive frequency.
   */
  public static fromInteger(value: bigint): Frequency {
    return new Frequency(value);
  }

  /**
   * Creates a frequency from a rational value.
   *
   * @param numerator - Positive numerator.
   * @param denominator - Positive denominator.
   */
  public static fromRatio(numerator: bigint, denominator: bigint): Frequency {
    return new Frequency(numerator, denominator);
  }
}

/**
 * Calculates the greatest common divisor using Euclid's algorithm.
 *
 * @param a - First positive integer.
 * @param b - Second positive integer.
 * @returns The greatest common divisor.
 */
function gcd(a: bigint, b: bigint): bigint {
  while (b !== 0n) {
    const remainder = a % b;
    a = b;
    b = remainder;
  }

  return a;
}
