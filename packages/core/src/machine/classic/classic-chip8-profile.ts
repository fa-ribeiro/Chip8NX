import { address } from "../../core/types/address.ts";
import { Frequency } from "../../core/types/frequency.ts";
import { CLASSIC_FONT_IMAGE } from "../../font/classic-font-image.ts";
import type { Chip8Profile } from "../chip8-profile.ts";

/**
 * Profile for the Classic CHIP-8 machine.
 *
 * @remarks
 * This object provides the complete declarative machine definition used when
 * assembling a Classic CHIP-8 interpreter. It does not select concrete host
 * implementations such as keyboards, displays, memory, clocks, or schedulers.
 */
export const CLASSIC_CHIP8_PROFILE = {
  memorySize: 0x1000,

  programStartAddress: address(0x200),

  stackCapacity: 16,

  display: {
    specification: { kind: "fixed", width: 64, height: 32 },
    refreshFrequency: Frequency.fromInteger(60n),
  },

  timerFrequency: Frequency.fromInteger(60n),

  fontImage: CLASSIC_FONT_IMAGE,

  fontBaseAddress: address(0x50),

  largeFont: null,

  instructionSet: { kind: "chip8" },

  quirks: {
    shiftSource: "vy",
    memoryTransferIndex: "increment-by-count",
    jumpOffsetSource: "v0",
    logicFlag: "reset",
    spriteOverflow: "clip",
    spriteDrawTiming: {
      kind: "uniform",
      timing: "vertical-blank",
    },
    indexOverflow: "continue",
  },
} satisfies Chip8Profile;
