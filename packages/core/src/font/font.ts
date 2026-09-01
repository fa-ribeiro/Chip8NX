import type { Address } from "../core/types/address.ts";
import type { Byte } from "../core/types/byte.ts";

/**
 * Resolves CHIP-8 font glyphs to their memory addresses.
 *
 * The font abstraction deliberately describes only the information required
 * by instructions such as `FX29`: where the sprite for a character lives.
 * It does not own memory or define how font bytes are loaded into memory.
 *
 * Implementations may use different font layouts or locations, allowing the
 * emulator to support different CHIP-8-family configurations without coupling
 * instruction execution to a particular memory map.
 */
export interface Font {
  /**
   * Returns the memory address of the sprite for a register value.
   *
   * @param value - Register value used to select the glyph.
   * @returns Address at which the corresponding sprite begins.
   */
  getSpriteAddress(value: Byte): Address;
}
