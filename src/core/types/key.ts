/**
 * A CHIP-8 hexadecimal keypad key.
 *
 * Classic CHIP-8 provides sixteen keys whose values range from `0x0` to
 * `0xF`.
 *
 * The branded type prevents arbitrary numbers from being accidentally used
 * where a CHIP-8 key is expected.
 *
 * @remarks
 * The runtime representation is a JavaScript `number`. The brand exists only
 * at the TypeScript type level.
 */
export type Key = number & { readonly __brand: "Key" };

/**
 * Creates a {@link Key} from a number.
 *
 * @param value - The value to validate and represent as a CHIP-8 key.
 * @returns The value represented as a {@link Key}.
 *
 * @throws {@link RangeError}
 * Thrown when `value` is not an integer between `0x0` and `0xF`.
 */
export function key(value: number): Key {
  if (!Number.isInteger(value) || value < 0x0 || value > 0xf) {
    throw new RangeError(
      `Invalid CHIP-8 key: ${value}. Expected an integer between 0x0 and 0xF.`,
    );
  }

  return value as Key;
}
