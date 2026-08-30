/**
 * A CHIP-8 opcode.
 *
 * CHIP-8 instructions are 16-bit values.
 */
export type Opcode = number & { readonly __brand: "Opcode" };

/**
 * Creates an {@link Opcode} from a number.
 *
 * @param value - The value to validate and represent as an opcode.
 * @returns The value represented as an {@link Opcode}.
 *
 * @throws {@link RangeError}
 * If `value` is not an integer in the range 0x0000..0xFFFF.
 */
export function opcode(value: number): Opcode {
  if (!Number.isInteger(value) || value < 0x0000 || value > 0xffff) {
    throw new RangeError(
      `Invalid opcode value: ${value}. Expected an integer between 0x0000 and 0xFFFF.`,
    );
  }

  return value as Opcode;
}
