import type { Byte } from "../core/types/byte.ts";
import type { RandomNumberGenerator } from "./random-number-generator.ts";
/**
 * RandomNumberGenerator implementation backed by JavaScript's
 * `Math.random()`.
 *
 * @remarks
 * `Math.random()` produces a floating-point value in the range `[0, 1)`.
 * Multiplying by 256 and flooring produces an integer in `[0, 255]`,
 * matching the byte range required by CHIP-8.
 *
 * This generator is intended for normal emulation. It is not intended for
 * cryptographic purposes.
 */
export class DefaultRandomNumberGenerator implements RandomNumberGenerator {
  /**
   * {@inheritDoc RandomNumberGenerator.nextByte}
   */
  public nextByte(): Byte {
    return Math.floor(Math.random() * 0x100) as Byte;
  }
}
