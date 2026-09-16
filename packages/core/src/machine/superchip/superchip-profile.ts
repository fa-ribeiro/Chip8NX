import { address } from "../../core/types/address.ts";
import type { Chip8Profile } from "../chip8-profile.ts";
import { CHIP48_PROFILE } from "../chip48/chip48-profile.ts";
import { SUPERCHIP_LARGE_FONT_IMAGE } from "../../font/superchip-large-font-image.ts";
/**
 * SUPER-CHIP 1.1 machine profile.
 *
 * @remarks
 * SUPER-CHIP evolved from CHIP-48 and retains its compatibility behavior
 * while adding a switchable 64×32 / 128×64 display.
 *
 * The profile also selects the historical SUPER-CHIP semantics currently
 * modeled by Chip8NX, including the large font, persistent RPL flags,
 * interpreter exit behavior, and display-mode-dependent drawing.
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
