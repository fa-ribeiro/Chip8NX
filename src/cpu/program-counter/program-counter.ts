import { type Address, address } from "../../core/types/address.ts";

/**
 * The default address at which a CHIP-8 program is loaded.
 */
export const DEFAULT_PROGRAM_START_ADDRESS = address(0x200);

/**
 * The size, in bytes, of a CHIP-8 instruction.
 *
 * CHIP-8 instructions are always two bytes wide.
 */
export const INSTRUCTION_SIZE = 2;

/**
 * Represents the CHIP-8 program counter.
 *
 * @remarks
 * The program counter contains the address of the next instruction to
 * execute. It encapsulates program-counter-specific operations such as
 * advancing to the next instruction.
 *
 * The program counter does not fetch or decode instructions. Those
 * responsibilities belong to higher-level CPU components.
 */
export class ProgramCounter {
  private value: Address;

  /**
   * Creates a program counter.
   *
   * @param initialValue - Initial program counter address.
   *
   * @default {@link DEFAULT_PROGRAM_START_ADDRESS}
   */
  public constructor(initialValue: Address = DEFAULT_PROGRAM_START_ADDRESS) {
    this.value = initialValue;
  }

  /**
   * Returns the current program counter address.
   */
  public getValue(): Address {
    return this.value;
  }

  /**
   * Sets the program counter to an explicit address.
   *
   * @param value - The new program counter address.
   */
  public setValue(value: Address): void {
    this.value = value;
  }

  /**
   * Advances the program counter to the next CHIP-8 instruction.
   *
   * @remarks
   * CHIP-8 instructions are two bytes wide, so advancing the program
   * counter increments its address by two.
   *
   * Address validation is delegated to the {@link Address} value type.
   * This keeps address-range rules centralized rather than duplicating
   * them in the program counter.
   */
  public advance(): void {
    this.value = address(this.value + INSTRUCTION_SIZE);
  }
}
