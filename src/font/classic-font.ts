import { type Address, address } from "../core/types/address.ts";
import type { Byte } from "../core/types/byte.ts";
import type { Font } from "./font.ts";

/**
 * Conventional start address for the classic CHIP-8 hexadecimal font.
 */
export const DEFAULT_CLASSIC_FONT_BASE_ADDRESS = address(0x50);

/**
 * Number of bytes occupied by each classic CHIP-8 glyph.
 */
export const CLASSIC_FONT_GLYPH_SIZE = 5;

/**
 * Resolves addresses within the classic CHIP-8 hexadecimal font.
 *
 * Classic CHIP-8 provides 16 glyphs (`0` through `F`), each five bytes high.
 * The original interpreter selected the glyph from the low nibble of the
 * register value used by `FX29`.
 *
 * This class models only the font layout. Loading the corresponding sprite
 * bytes into memory remains the responsibility of a higher-level component.
 */
export class ClassicFont implements Font {
  /**
   * Creates a classic CHIP-8 font layout.
   *
   * @param baseAddress - Address at which the first glyph (`0`) begins.
   *
   * @default {@link DEFAULT_CLASSIC_FONT_BASE_ADDRESS}
   */
  public constructor(
    private readonly baseAddress: Address = DEFAULT_CLASSIC_FONT_BASE_ADDRESS,
  ) {}

  /**
   * {@inheritDoc Font.getSpriteAddress}
   *
   * Only the low nibble is used, matching the original CHIP-8 behavior.
   */
  public getSpriteAddress(value: Byte): Address {
    const digit = value & 0x0f;

    return address(this.baseAddress + digit * CLASSIC_FONT_GLYPH_SIZE);
  }
}
