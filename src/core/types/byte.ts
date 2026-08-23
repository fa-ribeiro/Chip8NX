/**
 * An unsigned 8-bit value.
 *
 * A {@link Byte} is guaranteed to contain an integer in the range
 * `0x00` through `0xFF` (0 through 255).
 *
 * The branded type prevents a `Byte` from being accidentally substituted
 * with another domain-specific numeric type, such as {@link Address}.
 *
 * @remarks
 * The runtime representation is still a JavaScript `number`. The brand is
 * purely a TypeScript compile-time mechanism.
 */
export type Byte = number & {
  readonly __brand: "Byte";
};

/**
 * Creates a {@link Byte} from a number.
 *
 * @param value - The value to validate and represent as a byte.
 * @returns The value represented as a {@link Byte}.
 *
 * @throws {@link RangeError}
 * Thrown when `value` is not an integer in the range `0x00` through `0xFF`.
 */
export function byte(value: number): Byte {
  if (!Number.isInteger(value) || value < 0 || value > 0xff) {
    throw new RangeError(
      `Invalid byte value: ${value}. Expected an integer between 0 and 255.`,
    );
  }

  return value as Byte;
}
