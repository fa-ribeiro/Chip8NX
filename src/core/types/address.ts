/**
 * A non-negative integer representing a memory address.
 *
 * {@link Address} deliberately does not impose a maximum value.
 * The valid address range is determined by the address space of the
 * memory implementation using it.
 *
 * For example, Classic CHIP-8 uses a 12-bit address space (`0x000`-`0xFFF`),
 * but keeping that limit outside this type allows the same domain type to
 * support CHIP-8-family implementations with different address spaces.
 *
 * @remarks
 * The runtime representation is still a JavaScript `number`. The brand is
 * purely a TypeScript compile-time mechanism.
 */
export type Address = number & {
  readonly __brand: "Address";
};

/**
 * Creates an {@link Address} from a number.
 *
 * @param value - The value to validate and represent as an address.
 * @returns The value represented as an {@link Address}.
 *
 * @throws {@link RangeError}
 * Thrown when `value` is not a non-negative integer.
 */
export function address(value: number): Address {
  if (!Number.isInteger(value) || value < 0) {
    throw new RangeError(
      `Invalid address value: ${value}. Expected a non-negative integer.`,
    );
  }

  return value as Address;
}
