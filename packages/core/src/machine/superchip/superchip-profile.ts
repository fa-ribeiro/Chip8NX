import { address } from "../../core/types/address.ts";
import type { Chip8Profile } from "../chip8-profile.ts";
import { CHIP48_PROFILE } from "../chip48/chip48-profile.ts";
import { SUPERCHIP_LARGE_FONT_IMAGE } from "../../font/superchip-large-font-image.ts";

/**
 * Profile for the historical SUPER-CHIP 1.1 machine.
 *
 * @remarks
 * SUPER-CHIP evolved from CHIP-48 and reuses much of its machine
 * configuration and shared-instruction behavior while extending the machine
 * with a switchable 64×32 / 128×64 display and a large font.
 *
 * The profile selects the SUPER-CHIP 1.1 instruction semantics and overrides
 * the shared-instruction quirks that differ from CHIP-48.
 *
 * Lifecycle concerns such as persistence of RPL flags remain outside the
 * profile.
 */
export const SUPERCHIP_PROFILE = {
  ...CHIP48_PROFILE,

  display: {
    specification: {
      kind: "superchip",
      backingWidth: 128,
      backingHeight: 64,
      initialMode: "low",
    },
    refreshFrequency: CHIP48_PROFILE.display.refreshFrequency,
  },

  fonts: {
    ...CHIP48_PROFILE.fonts,

    large: {
      image: SUPERCHIP_LARGE_FONT_IMAGE,
      baseAddress: address(0x0a0),
    },
  },

  instructionSet: { kind: "superchip-1.1" },

  quirks: {
    ...CHIP48_PROFILE.quirks,

    memoryTransferIndex: "unchanged",

    spriteDrawTiming: {
      kind: "display-mode",
      low: "vertical-blank",
      high: "immediate",
    },
    indexOverflow: "exit-interpreter",
  },
} satisfies Chip8Profile;
