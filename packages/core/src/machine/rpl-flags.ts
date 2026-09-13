import type { Byte } from "../core/types/byte.ts";
import type { RegisterIndex } from "../cpu/registers/register-index.ts";
import { byte } from "../core/types/byte.ts";

/**
 * Persistent SUPER-CHIP RPL user-flag storage.
 *
 * @remarks
 * SUPER-CHIP exposes eight persistent flag bytes through `Fx75` and `Fx85`,
 * corresponding to registers V0 through V7.
 *
 * This state intentionally has no reset operation. Its lifetime is longer
 * than an individual program execution or machine reset.
 */
export class RplFlags {
  private static readonly FLAG_COUNT = 8;

  private readonly values: Byte[] = Array.from({ length: RplFlags.FLAG_COUNT }, () => byte(0));

  /**
   * Reads one RPL flag.
   */
  public get(index: RegisterIndex): Byte {
    this.validateIndex(index);

    return this.values[index]!;
  }

  /**
   * Writes one RPL flag.
   */
  public set(index: RegisterIndex, value: Byte): void {
    this.validateIndex(index);

    this.values[index] = value;
  }

  private validateIndex(index: RegisterIndex): void {
    if (index >= RplFlags.FLAG_COUNT) {
      throw new RangeError(`Invalid RPL flag index: ${index}. Expected V0 through V7.`);
    }
  }
}
