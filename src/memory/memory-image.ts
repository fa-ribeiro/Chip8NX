import { type Byte, byte } from "../core/types/byte.ts";

/**
 * An immutable sequence of bytes intended to be loaded into memory.
 *
 * A memory image represents binary contents independently of where those
 * contents will be placed. The destination address is chosen by the
 * component loading the image into a {@link Memory} implementation.
 *
 * @remarks
 * The constructor accepts raw numeric byte values so that common binary
 * sources, such as {@link Uint8Array}, can be used directly. Each value is
 * validated and converted to the {@link Byte} domain type.
 *
 * The supplied iterable is copied, so subsequent changes to the source do
 * not affect the image.
 */
export class MemoryImage {
  /**
   * Immutable bytes contained in this image.
   */
  public readonly bytes: readonly Byte[];

  /**
   * Creates a memory image from binary data.
   *
   * @param bytes - Binary values to copy into the image.
   *
   * @throws {@link RangeError}
   * Thrown when any supplied value is not a valid byte.
   */
  public constructor(bytes: Iterable<number>) {
    this.bytes = Object.freeze(Array.from(bytes, (value) => byte(value)));
  }
}
