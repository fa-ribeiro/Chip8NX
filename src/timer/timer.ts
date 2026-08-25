import { type Byte, byte } from "../core/types/byte.ts";

/**
 * Represents a timer in the CHIP-8 CPU.
 *
 * @remarks
 * CHIP-8 has two timers, the delay timer and sound timer. Both share the
 * same countdown semantics, so they can be represented by this class.
 *
 * A Timer is deliberately unaware of clocks, schedulers, or sound output.
 * Something outside the timer is responsible for calling {@link tick} at
 * the appropriate frequency.
 */
export class Timer {
  private value: Byte;

  /**
   *  Creates a new timer with the specified initial value.
   *
   * @param initialValue - The initial value of the timer. Defaults to 0.
   *
   * @throws {RangeError}
   * If `initialValue` is not a valid Byte (0-255).
   */
  public constructor(initialValue: Byte = byte(0)) {
    this.value = initialValue;
  }

  /**
   * Gets the current timer value.
   *
   * @returns The current timer value as a Byte.
   */
  public getValue(): Byte {
    return this.value;
  }

  /**
   * Sets the timer value.
   *
   * @param value - The new timer value.
   *
   * @throws {RangeError}
   * If `value` is not a valid Byte (0-255).
   */
  public setValue(value: Byte): void {
    this.value = value;
  }

  /**
   * Decrements the timer by 1 if it is greater than 0.
   *
   * @remarks
   * The timer stops at zero. It never wraps from zero to 255.
   */
  public tick(): void {
    if (this.value > 0) {
      this.value = byte(this.value - 1);
    }
  }
}
