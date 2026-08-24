import { type Byte, byte } from "../core/types/byte.ts";

/**
 * Represents an unsigned 8-bit countdown timer.
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
  private value: Byte = 0 as Byte;

  /**
   * Returns the current timer value.
   */
  public getValue(): Byte {
    return this.value;
  }

  /**
   * Sets the timer value.
   *
   * @param value - New timer value.
   */
  public setValue(value: Byte): void {
    this.value = value;
  }

  /**
   * Advances the timer by one CHIP-8 timer tick.
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
