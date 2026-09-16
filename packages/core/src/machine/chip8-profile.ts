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
 * Selects what happens when Fx1E moves I beyond the machine address space.
 */
export type IndexOverflowBehavior = "continue" | "exit-interpreter";

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
 * Describes behavioral variations of instructions shared by supported CHIP-8
 * variants.
 *
 * @remarks
 * Quirks answer how shared instructions behave. They do not describe whether
 * an instruction exists; instruction-set membership belongs to
 * {@link Chip8InstructionSet}.
 *
 * Properties use explicit semantic choices rather than boolean "quirk" flags
 * so their meaning does not depend on interpreting enabled/disabled
 * terminology.
 */
export interface Chip8Quirks {
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
   * Determines whether Fx1E may continue when I leaves the address space or
   * exits the interpreter as on historical SUPER-CHIP.
   */
  readonly indexOverflow: IndexOverflowBehavior;
}

/**
 * Identifies the instruction semantics available to a machine profile.
 *
 * @remarks
 * This describes instruction-set membership and extension-specific semantics.
 * Behavioral variations of instructions shared between supported variants
 * belong to {@link Chip8Quirks}.
 */
export type Chip8InstructionSet =
  | {
    readonly kind: "chip8";
  }
  | {
    readonly kind: "superchip-1.1";
  };

/**
 * Describes a supported CHIP-8 machine profile.
 *
 * @remarks
 * A profile combines the machine characteristics needed for composition with
 * its instruction-set identity and shared-instruction quirks.
 *
 * Concrete component implementations and host/runtime policy remain outside
 * the profile.
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
  readonly fonts: {
    /**
     * Small CHIP-8 font.
     */
    readonly small: {
      /**
       * Font image installed in machine memory.
       */
      readonly image: MemoryImage;

      /**
       * Address at which the font image is installed.
       */
      readonly baseAddress: Address;
    };

    /**
     * Optional large font provided by the machine.
     *
     * Machines without a large font use `null`.
     */
    readonly large: {
      /**
       * Large-font image installed in machine memory.
       */
      readonly image: MemoryImage;

      /**
       * Address at which the large-font image is installed.
       */
      readonly baseAddress: Address;
    } | null;
  };

  /**
   * Instruction semantics available to the machine.
   */
  readonly instructionSet: Chip8InstructionSet;

  /**
   * Behavioral variations of instructions shared with other supported variants.
   */
  readonly quirks: Chip8Quirks;
}
