import { Frequency } from "../../core/types/frequency.ts";
import type { Chip8Profile } from "../chip8-profile.ts";
import { SUPERCHIP_PROFILE } from "../superchip/superchip-profile.ts";

const MODERN_SUPERCHIP_FREQUENCY = Frequency.fromInteger(60n);

/**
 * Profile for Modern SUPER-CHIP.
 *
 * @remarks
 * Modern SUPER-CHIP keeps the SUPER-CHIP machine resources and instruction
 * vocabulary while simplifying several historical calculator behaviors.
 *
 * Instruction-specific differences from SUPER-CHIP 1.1 are selected by the
 * "superchip-modern" instruction set. Behavioral variations of instructions
 * shared with other supported variants remain represented by quirks.
 *
 * Lifecycle concerns such as persistence of RPL flags remain outside the
 * profile.
 */
export const SUPERCHIP_MODERN_PROFILE = {
  ...SUPERCHIP_PROFILE,

  display: {
    ...SUPERCHIP_PROFILE.display,
    refreshFrequency: MODERN_SUPERCHIP_FREQUENCY,
  },

  timerFrequency: MODERN_SUPERCHIP_FREQUENCY,

  instructionSet: {
    kind: "superchip-modern",
  },

  quirks: {
    ...SUPERCHIP_PROFILE.quirks,

    spriteDrawTiming: {
      kind: "uniform",
      timing: "immediate",
    },

    indexOverflow: "continue",
  },
} satisfies Chip8Profile;
