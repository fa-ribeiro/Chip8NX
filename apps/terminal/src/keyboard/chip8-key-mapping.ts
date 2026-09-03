import { type Key, key } from "@chip8nx/core";

/**
 * Maps one semantic terminal character to a CHIP-8 keypad key.
 */
export type TerminalKeyMapping = (character: string) => Key | undefined;

/**
 * Maps a terminal keyboard character to the corresponding CHIP-8 hexadecimal
 * keypad key.
 *
 * The mapping preserves the conventional physical CHIP-8 keypad layout:
 *
 * ```text
 * Terminal       CHIP-8
 *
 * 1 2 3 4        1 2 3 C
 * Q W E R        4 5 6 D
 * A S D F        7 8 9 E
 * Z X C V        A 0 B F
 * ```
 *
 * Letter mappings are case-insensitive. Characters that are not part of the
 * CHIP-8 keypad mapping return `undefined`.
 */
export function mapTerminalCharacterToChip8Key(character: string): Key | undefined {
  switch (character.toLowerCase()) {
    case "1":
      return key(0x1);
    case "2":
      return key(0x2);
    case "3":
      return key(0x3);
    case "4":
      return key(0xc);

    case "q":
      return key(0x4);
    case "w":
      return key(0x5);
    case "e":
      return key(0x6);
    case "r":
      return key(0xd);

    case "a":
      return key(0x7);
    case "s":
      return key(0x8);
    case "d":
      return key(0x9);
    case "f":
      return key(0xe);

    case "z":
      return key(0xa);
    case "x":
      return key(0x0);
    case "c":
      return key(0xb);
    case "v":
      return key(0xf);

    default:
      return undefined;
  }
}
