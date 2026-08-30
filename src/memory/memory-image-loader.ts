import { type Address, address } from "../core/types/address.ts";
import type { Memory } from "./memory.ts";
import type { MemoryImage } from "./memory-image.ts";
import { Byte } from "../core/types/byte.ts";

/**
 * Loads contiguous binary images into memory.
 *
 * The loader deliberately has no knowledge of what an image represents.
 * Fonts, programs, test data, and other binary contents are treated
 * identically.
 *
 * The destination address belongs to the load operation rather than to the
 * {@link MemoryImage}, allowing the same image to be placed at different
 * locations.
 *
 * Address-space validation remains the responsibility of the supplied
 * {@link Memory} implementation.
 */
export class MemoryImageLoader {
  /**
   * Loads an image into memory starting at the specified address.
   *
   * Bytes are written sequentially beginning at `startAddress`.
   *
   * @param memory - Memory into which the image will be loaded.
   * @param startAddress - Address at which the first image byte is written.
   * @param image - Binary image to load.
   *
   * @throws {@link RangeError}
   * Propagated when the memory implementation rejects one of the destination
   * addresses.
   */
  public load(memory: Memory, startAddress: Address, image: MemoryImage): void {
    for (let offset = 0; offset < image.bytes.length; offset++) {
      memory.write(address(startAddress + offset), image.bytes[offset] as Byte);
    }
  }
}
