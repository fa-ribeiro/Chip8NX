import type { Address } from "../core/types/address.ts";
import type { Frequency } from "../core/types/frequency.ts";
import type { MemoryImage } from "../memory/memory-image.ts";

import type { SpriteOverflowBehavior } from "../display/display-buffer.ts";

/**
 * Selects which register provides the input value for CHIP-8 shift
 * instructions 8xy6 and 8xyE.
 *
 * AKA the SHIFT QUIRK.
 */
export type ShiftSource = "vx" | "vy";

/**
 * Selects how Fx55 and Fx65 update the index register after transferring
 * registers V0 through Vx.
 *
 * - "increment-by-count" advances I by X + 1, the number of registers
 *   transferred.
 * - "increment-by-x" advances I by X.
 * - "unchanged" leaves I unchanged.
 *
 * AKA the MEMORY QUIRK.
 */
export type MemoryTransferIndexBehavior = "increment-by-count" | "increment-by-x" | "unchanged";

/**
 * Selects which register provides the offset for BNNN.
 *
 * AKA the JUMP OFFSET QUIRK.
 */
export type JumpOffsetSource = "v0" | "vx";

/**
 * Selects how 8xy1, 8xy2, and 8xy3 affect VF.
 *
 * AKA the LOGIC FLAG QUIRK.
 */
export type LogicFlagBehavior = "reset" | "unchanged";

/**
 * Selects when Dxyn may draw a sprite.
 */
export type SpriteDrawTiming = "vertical-blank" | "immediate";

/**
 * Describes compatibility-sensitive CHIP-8 instruction behavior.
 *
 * @remarks
 * Properties use explicit semantic choices rather than boolean "quirk"
 * flags so their meaning does not depend on interpreting enabled/disabled
 * terminology.
 */
export interface Chip8Compatibility {
  /**
   * Register whose value is shifted by 8xy6 and 8xyE.
   *
   * The result is always written to Vx.
   */
  readonly shiftSource: ShiftSource;

  /**
   * Determines whether Fx55 and Fx65 advance I after transferring
   * registers.
   */
  readonly memoryTransferIndex: MemoryTransferIndexBehavior;

  /**
   * Register whose value is added to the BNNN target address.
   *
   * "v0" uses V0.
   * "vx" uses the X register encoded by the instruction.
   */
  readonly jumpOffsetSource: JumpOffsetSource;

  /**
   * Determines how OR, AND, and XOR affect VF.
   */
  readonly logicFlag: LogicFlagBehavior;

  /**
   * Determines whether sprite pixels extending beyond the right or
   * bottom display edges are clipped or wrapped.
   *
   * Initial sprite coordinates are normalized independently of this
   * behavior.
   */
  readonly spriteOverflow: SpriteOverflowBehavior;

  /**
   * Determines whether Dxyn must wait for a vertical-blank opportunity
   * before drawing or may draw immediately.
   */
  readonly spriteDrawTiming: SpriteDrawTiming;
}

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

  /**
   * Compatibility-sensitive instruction behavior.
   */
  readonly compatibility: Chip8Compatibility;
}
