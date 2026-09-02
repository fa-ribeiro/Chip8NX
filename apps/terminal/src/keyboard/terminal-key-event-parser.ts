import type {
  TerminalKeyEvent,
  TerminalKeyEventType,
  TerminalKeyModifiers,
} from "./terminal-key-event.ts";

const ESCAPE = 0x1b;
const LEFT_BRACKET = 0x5b;
const CSI_U = 0x75;

const CSI_FINAL_BYTE_MIN = 0x40;
const CSI_FINAL_BYTE_MAX = 0x7e;

const SHIFT = 0b0000_0001;
const ALT = 0b0000_0010;
const CTRL = 0b0000_0100;
const SUPER = 0b0000_1000;
const HYPER = 0b0001_0000;
const META = 0b0010_0000;
const CAPS_LOCK = 0b0100_0000;
const NUM_LOCK = 0b1000_0000;

/**
 * Incrementally decodes terminal input into semantic keyboard events.
 *
 * Plain legacy bytes become press events. CSI-u sequences can additionally
 * represent repeat and release events.
 *
 * Input is buffered because a terminal escape sequence may be split across
 * multiple reads from stdin.
 */
export class TerminalKeyEventParser {
  private readonly pendingBytes: number[] = [];

  /**
   * Feeds another chunk of terminal input into the parser.
   *
   * Complete events are returned immediately. An incomplete escape sequence
   * remains buffered until a later chunk completes it.
   */
  public feed(input: Uint8Array): TerminalKeyEvent[] {
    this.pendingBytes.push(...input);

    const events: TerminalKeyEvent[] = [];

    while (this.pendingBytes.length > 0) {
      const firstByte = this.pendingBytes[0];

      if (firstByte !== ESCAPE) {
        this.pendingBytes.shift();

        if (firstByte !== undefined && firstByte <= 0x7f) {
          events.push(createLegacyEvent(firstByte));
        }

        continue;
      }

      if (this.pendingBytes.length < 2) {
        break;
      }

      if (this.pendingBytes[1] !== LEFT_BRACKET) {
        /*
         * An ESC-prefixed legacy sequence represents input such as Alt+key.
         * It is intentionally ignored rather than accidentally treating the
         * following character as an unmodified CHIP-8 key.
         */
        this.pendingBytes.splice(0, 2);
        continue;
      }

      const finalByteIndex = findCsiFinalByte(this.pendingBytes);

      if (finalByteIndex === undefined) {
        break;
      }

      const sequence = this.pendingBytes.splice(0, finalByteIndex + 1);

      if (sequence.at(-1) !== CSI_U) {
        // Other CSI sequences are outside this parser's current scope.
        continue;
      }

      const parameters = String.fromCharCode(...sequence.slice(2, -1));

      const event = parseCsiUEvent(parameters);

      if (event !== undefined) {
        events.push(event);
      }
    }

    return events;
  }
}

function findCsiFinalByte(bytes: readonly number[]): number | undefined {
  for (let index = 2; index < bytes.length; index++) {
    const byte = bytes[index];

    if (byte !== undefined && byte >= CSI_FINAL_BYTE_MIN && byte <= CSI_FINAL_BYTE_MAX) {
      return index;
    }
  }

  return undefined;
}

function parseCsiUEvent(parameters: string): TerminalKeyEvent | undefined {
  const fields = parameters.split(";");

  const primaryKeyCodeText = fields[0]?.split(":")[0];

  if (primaryKeyCodeText === undefined) {
    return undefined;
  }

  const keyCode = Number(primaryKeyCodeText);

  if (!Number.isInteger(keyCode) || keyCode <= 0 || keyCode > 0x10ffff) {
    return undefined;
  }

  const modifierAndEvent = fields[1] ?? "1";
  const [encodedModifiersText, eventTypeText] = modifierAndEvent.split(":");

  const encodedModifiers = encodedModifiersText === "" ? 1 : Number(encodedModifiersText);

  if (!Number.isInteger(encodedModifiers) || encodedModifiers < 1) {
    return undefined;
  }

  const eventType = decodeEventType(eventTypeText);

  if (eventType === undefined) {
    return undefined;
  }

  return {
    source: "csi-u",
    type: eventType,
    character: String.fromCodePoint(keyCode),
    modifiers: decodeModifiers(encodedModifiers - 1),
  };
}

function decodeEventType(encoded: string | undefined): TerminalKeyEventType | undefined {
  switch (encoded ?? "1") {
    case "":
    case "1":
      return "press";

    case "2":
      return "repeat";

    case "3":
      return "release";

    default:
      return undefined;
  }
}

function decodeModifiers(bitmask: number): TerminalKeyModifiers {
  return {
    shift: (bitmask & SHIFT) !== 0,
    alt: (bitmask & ALT) !== 0,
    ctrl: (bitmask & CTRL) !== 0,
    super: (bitmask & SUPER) !== 0,
    hyper: (bitmask & HYPER) !== 0,
    meta: (bitmask & META) !== 0,
    capsLock: (bitmask & CAPS_LOCK) !== 0,
    numLock: (bitmask & NUM_LOCK) !== 0,
  };
}

function createLegacyEvent(byte: number): TerminalKeyEvent {
  return {
    source: "legacy",
    type: "press",
    character: String.fromCharCode(byte),
    modifiers: {
      shift: false,
      alt: false,
      ctrl: false,
      super: false,
      hyper: false,
      meta: false,
      capsLock: false,
      numLock: false,
    },
  };
}
