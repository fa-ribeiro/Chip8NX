import type { Byte } from "../core/types/byte.ts";

/**
 * Generates pseudo-random byte values.
 *
 * The generator is deliberately unaware of CHIP-8 instructions. It provides
 * random bytes; interpreting those bytes is the responsibility of the
 * component consuming them.
 *
 * Implementations may use different sources or algorithms, allowing the
 * emulator to substitute deterministic generators for testing.
 */
export interface RandomNumberGenerator {
  /**
   * Generates a random 8-bit unsigned value.
   *
   * @returns A value in the range `0x00` through `0xFF`.
   */
  nextByte(): Byte;
}
