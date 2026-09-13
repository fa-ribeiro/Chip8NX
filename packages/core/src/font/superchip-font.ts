import { type Address, address } from "../core/types/address.ts";
import type { Byte } from "../core/types/byte.ts";
import { ClassicFont } from "./classic-font.ts";
import type { Font, FontSize } from "./font.ts";
import { SUPERCHIP_LARGE_FONT_GLYPH_SIZE } from "./superchip-large-font-image.ts";

/**
 * Resolves addresses within the SUPER-CHIP font sets.
 *
 * SUPER-CHIP 1.1 retains the classic five-byte hexadecimal font for `Fx29`
 * and adds a ten-byte decimal font for `Fx30`.
 *
 * Loading the corresponding font images into memory remains the
 * responsibility of machine initialization.
 */
export class SuperChipFont implements Font {
  private readonly smallFont: ClassicFont;

  /**
   * Creates a SUPER-CHIP font layout.
   *
   * @param smallFontBaseAddress - Address of the classic five-byte font.
   * @param largeFontBaseAddress - Address of the SUPER-CHIP ten-byte font.
   */
  public constructor(
    smallFontBaseAddress: Address,
    private readonly largeFontBaseAddress: Address,
  ) {
    this.smallFont = new ClassicFont(smallFontBaseAddress);
  }

  /**
   * {@inheritDoc Font.getSpriteAddress}
   */
  public getSpriteAddress(value: Byte, size: FontSize): Address {
    switch (size) {
      case "small":
        return this.smallFont.getSpriteAddress(value, "small");

      case "large":
        return address(this.largeFontBaseAddress + value * SUPERCHIP_LARGE_FONT_GLYPH_SIZE);
    }
  }
}
