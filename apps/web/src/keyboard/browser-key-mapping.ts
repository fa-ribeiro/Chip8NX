import { type Key, key } from "@chip8nx/core";

/**
 * Maps a physical browser keyboard position to a CHIP-8 key.
 *
 * KeyboardEvent.code is used rather than KeyboardEvent.key so the conventional
 * CHIP-8 4×4 layout follows physical key positions independently of Shift,
 * Caps Lock, or the character produced by the user's keyboard layout.
 */
export function mapBrowserCodeToChip8Key(code: string): Key | undefined {
  switch (code) {
    case "Digit1":
      return key(0x1);
    case "Digit2":
      return key(0x2);
    case "Digit3":
      return key(0x3);
    case "Digit4":
      return key(0xc);

    case "KeyQ":
      return key(0x4);
    case "KeyW":
      return key(0x5);
    case "KeyE":
      return key(0x6);
    case "KeyR":
      return key(0xd);

    case "KeyA":
      return key(0x7);
    case "KeyS":
      return key(0x8);
    case "KeyD":
      return key(0x9);
    case "KeyF":
      return key(0xe);

    case "KeyZ":
      return key(0xa);
    case "KeyX":
      return key(0x0);
    case "KeyC":
      return key(0xb);
    case "KeyV":
      return key(0xf);

    default:
      return undefined;
  }
}
