/**
 * The active logical display mode of a SUPER-CHIP display.
 *
 * The mode changes how the fixed 128×64 backing framebuffer is interpreted:
 *
 * - low:  64×32 logical pixels, each represented by a 2×2 backing block;
 * - high: 128×64 logical pixels, mapped directly to backing pixels.
 */
export type DisplayMode = "low" | "high";

/**
 * Describes a display whose backing and logical geometry are always identical.
 *
 * Classic CHIP-8 and CHIP-48 use this display model.
 */
export interface FixedDisplaySpecification {
  readonly kind: "fixed";
  readonly width: number;
  readonly height: number;
}

/**
 * Describes the historical SUPER-CHIP 1.1 display model.
 *
 * SUPER-CHIP uses one fixed backing framebuffer while the active logical
 * resolution may change at runtime. A freshly initialized machine starts
 * in low-resolution mode.
 */
export interface SuperChipDisplaySpecification {
  readonly kind: "superchip";
  readonly backingWidth: number;
  readonly backingHeight: number;
  readonly initialMode: "low";
}

/**
 * Describes the framebuffer geometry and mode model supported by a machine.
 *
 * This is immutable machine configuration. The active SUPER-CHIP display
 * mode itself becomes mutable DisplayBuffer state after construction.
 */
export type DisplaySpecification = FixedDisplaySpecification | SuperChipDisplaySpecification;
