import type { Address } from "../core/types/address.ts";
import type { Byte } from "../core/types/byte.ts";

/**
 * Provides byte-addressable memory.
 *
 * Implementations are responsible for storing and retrieving bytes from
 * addresses within their configured address space.
 *
 * Memory does not define how its contents are populated or interpreted.
 * For example, loading a ROM is the responsibility of a higher-level
 * component.
 */
export interface Memory {
  /**
   * Reads a byte from memory.
   *
   * @param address - Address from which to read.
   * @returns The byte stored at the specified address.
   *
   * @throws {@link RangeError}
   * Thrown when the address is outside this memory's address space.
   */
  read(address: Address): Byte;

  /**
   * Writes a byte to memory.
   *
   * @param address - Address at which to store the byte.
   * @param value - Byte to store.
   *
   * @throws {@link RangeError}
   * Thrown when the address is outside this memory's address space.
   */
  write(address: Address, value: Byte): void;
}
