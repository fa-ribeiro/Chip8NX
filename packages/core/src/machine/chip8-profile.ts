import type { Address } from "../core/types/address.ts";
import type { Frequency } from "../core/types/frequency.ts";
import type { MemoryImage } from "../memory/memory-image.ts";
import type { DisplaySpecification } from "../display/display-specification.ts";
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
 * Selects whether the machine implements the SUPER-CHIP interpreter-exit
 * instruction.
 */
export type InterpreterExitBehavior = "unsupported" | "exit";

/**
 * Selects whether Fx75 and Fx85 may access the SUPER-CHIP RPL user flags.
 */
export type RplFlagBehavior = "unsupported" | "v0-v7";

/**
 * Selects what happens when Fx1E moves I beyond the machine address space.
 */
export type IndexOverflowBehavior = "continue" | "exit-interpreter";

/**
 * Selects the historical meaning of SUPER-CHIP 00C0.
 */
export type ZeroScrollDownBehavior = "scroll" | "exit-interpreter";

/**
 * Describes how sprite drawing is synchronized with display refresh.
 *
 * A uniform policy applies the same timing in every display state.
 * A display-mode policy may vary timing between SUPER-CHIP low- and
 * high-resolution modes.
 */
export type SpriteDrawTimingBehavior =
  | {
    readonly kind: "uniform";
    readonly timing: SpriteDrawTiming;
  }
  | {
    readonly kind: "display-mode";
    readonly low: SpriteDrawTiming;
    readonly high: SpriteDrawTiming;
  };

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
  readonly spriteDrawTiming: SpriteDrawTimingBehavior;

  /**
   * Determines whether 00FD may exit the interpreter.
   */
  readonly interpreterExit: InterpreterExitBehavior;

  /**
   * Determines whether Fx75 and Fx85 may access RPL user flags.
   */
  readonly rplFlags: RplFlagBehavior;

  /**
   * Determines whether Fx1E may continue when I leaves the address space or
   * exits the interpreter as on historical SUPER-CHIP.
   */
  readonly indexOverflow: IndexOverflowBehavior;

  /**
   * Determines whether 00C0 performs a zero-row scroll or exits the
   * interpreter.
   */
  readonly zeroScrollDown: ZeroScrollDownBehavior;
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
   * Display characteristics used by the machine.
   */
  readonly display: {
    /**
     * Framebuffer geometry and display model.
     */
    readonly specification: DisplaySpecification;

    /**
     * Frequency at which display refresh opportunities occur.
     */
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
   * Optional large-font data provided by the machine.
   *
   * Machines without a large font use `null`.
   */
  readonly largeFont: {
    /**
     * Large-font image installed in machine memory.
     */
    readonly image: MemoryImage;

    /**
     * Address at which the large-font image is installed.
     */
    readonly baseAddress: Address;
  } | null;

  /**
   * Compatibility-sensitive instruction behavior.
   */
  readonly compatibility: Chip8Compatibility;
}
