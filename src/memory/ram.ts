import type { Address } from "../core/types/address.ts";
import type { Byte } from "../core/types/byte.ts";
import type { Memory } from "./memory.ts";

/**
 * A fixed-size random-access memory implementation.
 *
 * `Ram` stores bytes in a contiguous address space beginning at address
 * `0x000`.
 *
 * The size is supplied by the caller rather than being hard-coded for
 * Classic CHIP-8. This keeps the memory component independent from a
 * particular machine configuration and allows it to be reused by future
 * CHIP-8-family variants.
 */
export class Ram implements Memory {
  private readonly data: Uint8Array;

  /**
   * Creates a RAM instance with the specified capacity.
   *
   * @param size - Number of addressable bytes.
   *
   * @throws {@link RangeError}
   * Thrown when `size` is not a positive integer.
   */
  constructor(public readonly size: number) {
    if (!Number.isInteger(size) || size <= 0) {
      throw new RangeError(
        `Invalid memory size: ${size}. Expected a positive integer.`,
      );
    }

    this.data = new Uint8Array(size);
  }

  /**
   * {@inheritDoc Memory.read}
   */
  read(address: Address): Byte {
    this.validateAddress(address);

    return this.data[address] as Byte;
  }

  /**
   * {@inheritDoc Memory.write}
   */
  write(address: Address, value: Byte): void {
    this.validateAddress(address);

    this.data[address] = value;
  }

  /**
   * Verifies that an address belongs to this memory's address space.
   *
   * Keeping this validation in `Ram`, rather than in {@link Address}, is
   * important because `Address` represents an address value independently
   * of any particular memory implementation.
   */
  private validateAddress(address: Address): void {
    if (address >= this.size) {
      throw new RangeError(
        `Invalid memory address: 0x${address.toString(16).padStart(3, "0")}. ` +
          `Expected an address between 0x000 and ` +
          `0x${(this.size - 1).toString(16).padStart(3, "0")}.`,
      );
    }
  }
}
