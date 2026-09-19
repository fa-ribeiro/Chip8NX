import { type Address, address } from "../core/types/address.ts";
import type { Byte } from "../core/types/byte.ts";
import { ClassicFont } from "./classic-font.ts";
import type { Font, FontSize } from "./font.ts";
import { SUPERCHIP_LARGE_FONT_GLYPH_SIZE } from "./superchip-large-font-image.ts";

/**
 * Resolves addresses within the SUPER-CHIP font resources shared by the
 * supported historical and Modern profiles.
 *
 * Both profiles retain the classic five-byte hexadecimal font for `Fx29`
 * and use the ten-byte decimal font resource for `Fx30`. Instruction-set
 * semantics determine how those resources are used.
 *
 * Loading the corresponding font images into memory remains the
 * responsibility of machine initialization.
 */
export class SuperChipFont implements Font {
  private readonly smallFont: ClassicFont;

  /**
   * Creates the shared SUPER-CHIP font layout.
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
