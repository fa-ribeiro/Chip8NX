import type { Byte } from "../core/types/byte.ts";
import type { RandomNumberGenerator } from "./random-number-generator.ts";

/**
 * Deterministic RandomNumberGenerator implementation intended for tests.
 *
 * Values are returned in the order supplied to the constructor.
 */
export class TestRandomNumberGenerator implements RandomNumberGenerator {
  private readonly values: readonly Byte[];
  private index = 0;

  /**
   * Creates a deterministic random-number generator.
   *
   * @param values - Values to return on successive calls.
   *
   * @throws {@link RangeError}
   * Thrown when no values are provided.
   */
  constructor(values: readonly Byte[]) {
    if (values.length === 0) {
      throw new RangeError(
        "TestRandomNumberGenerator requires at least one value.",
      );
    }

    this.values = values;
  }

  /**
   * {@inheritDoc RandomNumberGenerator.nextByte}
   *
   * Values are returned cyclically.
   */
  public nextByte(): Byte {
    const value = this.values[this.index];

    this.index = (this.index + 1) % this.values.length;

    return value;
  }
}
