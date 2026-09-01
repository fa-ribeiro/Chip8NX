import type { Address } from "../core/types/address.ts";
import type { Frequency } from "../core/types/frequency.ts";
import type { MemoryImage } from "../memory/memory-image.ts";

/**
 * Describes the characteristics and compatibility behavior of a CHIP-8
 * machine.
 *
 * @remarks
 * A profile defines what machine is being emulated. It contains the
 * architectural characteristics needed to construct that machine, while
 * concrete component implementations and host/runtime behavior remain
 * outside the profile.
 */
export interface Chip8Profile {
  /**
   * Number of addressable bytes available to the machine.
   */
  readonly memorySize: number;

  /**
   * Address at which programs are loaded and execution begins.
   */
  readonly programStartAddress: Address;

  /**
   * Maximum number of return addresses the call stack can contain.
   */
  readonly stackCapacity: number;

  /**
   * Logical display geometry used by the machine.
   */
  readonly display: {
    readonly width: number;
    readonly height: number;
    readonly refreshFrequency: Frequency;
  };

  /**
   * Frequency at which the delay and sound timers decrement.
   */
  readonly timerFrequency: Frequency;

  /**
   * Font data provided by the machine.
   */
  readonly fontImage: MemoryImage;

  /**
   * Address at which the font image is installed in memory.
   */
  readonly fontBaseAddress: Address;
}
