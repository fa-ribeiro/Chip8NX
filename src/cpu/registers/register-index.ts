/**
 * Identifies one of the sixteen CHIP-8 general-purpose registers.
 *
 * Valid values are 0x0 through 0xF, corresponding to V0 through VF.
 */
export type RegisterIndex = number & { readonly __brand: "RegisterIndex" };

/**
 * Creates a validated {@link RegisterIndex}.
 *
 * @param value - Numeric register index.
 * @returns A valid register index.
 *
 * @throws {RangeError}
 * If `value` is not an integer between 0 and 15.
 */
export function registerIndex(value: number): RegisterIndex {
  if (!Number.isInteger(value) || value < 0 || value > 0x0f) {
    throw new RangeError(`Invalid CHIP-8 register index: ${value}`);
  }

  return value as RegisterIndex;
}
