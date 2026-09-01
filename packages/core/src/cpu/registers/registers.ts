import type { Byte } from "../../core/types/byte.ts";
import { byte } from "../../core/types/byte.ts";
import type { RegisterIndex } from "./register-index.ts";

/**
 * Number of general-purpose registers in the classic CHIP-8 architecture.
 */
export const REGISTER_COUNT = 16;

/**
 * Represents the sixteen CHIP-8 general-purpose registers V0 through VF.
 *
 * @remarks
 * Each register stores one {@link Byte}.
 *
 * Register storage is kept private so callers cannot bypass the register
 * abstraction and accidentally modify its internal representation.
 */
export class Registers {
  private readonly values: Byte[];

  /**
   * Creates a register bank with all registers initialized to zero.
   */
  public constructor() {
    this.values = new Array<Byte>(REGISTER_COUNT).fill(byte(0));
  }

  /**
   * Returns the value of a register.
   *
   * @param index - Register to read.
   */
  public get(index: RegisterIndex): Byte {
    return this.values[index] as Byte;
  }

  /**
   * Sets the value of a register.
   *
   * @param index - Register to modify.
   * @param value - New register value.
   */
  public set(index: RegisterIndex, value: Byte): void {
    this.values[index] = value;
  }

  /**
   * Clears all general-purpose registers.
   *
   * After this operation every register from V0 through VF contains zero.
   */
  public clear(): void {
    this.values.fill(byte(0));
  }

  /**
   * Returns a copy of all register values.
   *
   * @remarks
   * The returned array is independent of the live register bank. This makes
   * it suitable for CPU-state snapshots and debugging.
   */
  public snapshot(): readonly Byte[] {
    return [...this.values];
  }
}
