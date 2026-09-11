import { address } from "../../core/types/address.ts";
import { Frequency } from "../../core/types/frequency.ts";
import { CHIP48_FONT_IMAGE } from "../../font/chip48-font-image.ts";
import type { Chip8Profile } from "../chip8-profile.ts";

/**
 * Profile for the CHIP-48 2.25 machine.
 *
 * @remarks
 * CHIP-48 was Andreas Gustafsson's CHIP-8 interpreter for the HP48SX.
 *
 * This object describes the CHIP-48 machine characteristics and the
 * compatibility-sensitive behavior currently supported by Chip8NX.
 *
 * It does not select concrete host implementations such as keyboards,
 * displays, memory, clocks, or schedulers.
 */
export const CHIP48_PROFILE: Chip8Profile = {
  memorySize: 0x1000,

  programStartAddress: address(0x200),

  stackCapacity: 16,

  display: {
    width: 64,
    height: 32,
    refreshFrequency: Frequency.fromInteger(64n),
  },

  timerFrequency: Frequency.fromInteger(64n),

  fontImage: CHIP48_FONT_IMAGE,

  fontBaseAddress: address(0x000),

  compatibility: {
    shiftSource: "vx",
    memoryTransferIndex: "increment-by-x",
    jumpOffsetSource: "vx",
    logicFlag: "unchanged",
    spriteOverflow: "clip",
    spriteDrawTiming: "vertical-blank",
  },
};
