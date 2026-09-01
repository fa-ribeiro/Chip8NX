import { Address, address } from "../../core/types/address.ts";

/**
 * Represents the CHIP-8 index register.
 *
 * @remarks
 * The index register is used to store memory addresses for operations that
 * require them. It is often used in conjunction with the general-purpose
 * registers to perform memory operations.
 * @remarks
 * The historical CHIP-8 implementation used a register wider than the
 * 12-bit CHIP-8 memory address space. This emulator models `I` as an
 * `Address` because its architectural purpose is to identify a memory
 * address. Variant-specific behavior involving values outside the valid
 * memory address range belongs to the instruction/variant semantics rather
 * than to this register.
 */
export class IndexRegister {
  private value: Address;

  /**
   * Creates an index register.
   *
   * @param initialValue - Initial index register address.
   *
   * @default 0
   */
  public constructor(initialValue: Address = address(0)) {
    this.value = initialValue;
  }

  /**
   * Returns the current index register address.
   */
  public getValue(): Address {
    return this.value;
  }

  /**
   * Sets the current index register address.
   *
   * @param value - The new value for the index register.
   */
  public setValue(value: Address): void {
    this.value = value;
  }
}
