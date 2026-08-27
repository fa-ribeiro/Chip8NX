import { getN, getN0, getNN, getNNN, getX, getY } from "./opcode-fields.ts";
import type { Opcode } from "../core/types/opcode.ts";
import type { Instruction } from "./instruction.ts";

export class Decoder {
  public decode(opcode: Opcode): Instruction {
    switch (getN0(opcode)) {
      case 0x0:
        return this.decodeZeroFamily(opcode);

      case 0x1:
        return {
          kind: "jump",
          opcode,
          address: getNNN(opcode),
        };

      case 0x2:
        return {
          kind: "call",
          opcode,
          address: getNNN(opcode),
        };

      case 0x3:
        return {
          kind: "skip-equal-immediate",
          opcode,
          register: getX(opcode),
          value: getNN(opcode),
        };

      case 0x4:
        return {
          kind: "skip-not-equal-immediate",
          opcode,
          register: getX(opcode),
          value: getNN(opcode),
        };

      case 0x5:
        return this.decode5Family(opcode);

      case 0x6:
        return {
          kind: "load-immediate",
          opcode,
          register: getX(opcode),
          value: getNN(opcode),
        };

      case 0x7:
        return {
          kind: "add-immediate",
          opcode,
          register: getX(opcode),
          value: getNN(opcode),
        };

      case 0x8:
        return this.decode8Family(opcode);

      case 0x9:
        return this.decode9Family(opcode);

      case 0xa:
        return {
          kind: "set-index",
          opcode,
          address: getNNN(opcode),
        };

      case 0xb:
        return {
          kind: "jump-with-offset",
          opcode,
          address: getNNN(opcode),
        };

      case 0xc:
        return {
          kind: "random-and",
          opcode,
          register: getX(opcode),
          mask: getNN(opcode),
        };

      case 0xd:
        return {
          kind: "draw-sprite",
          opcode,
          x: getX(opcode),
          y: getY(opcode),
          height: getN(opcode),
        };

      case 0xe:
        return this.decodeEFamily(opcode);

      case 0xf:
        return this.decodeFFamily(opcode);

      default:
        throw new InvalidOpcodeError(opcode);
    }
  }

  private decodeZeroFamily(opcode: Opcode): Instruction {
    switch (opcode) {
      case 0x00e0:
        return {
          kind: "clear-screen",
          opcode,
        };

      case 0x00ee:
        return {
          kind: "return",
          opcode,
        };

      default:
        return {
          kind: "system-call",
          opcode,
          address: getNNN(opcode),
        };
    }
  }

  private decode5Family(opcode: Opcode): Instruction {
    if (getN(opcode) !== 0) {
      throw new InvalidOpcodeError(opcode);
    }

    return {
      kind: "skip-equal-register",
      opcode,
      x: getX(opcode),
      y: getY(opcode),
    };
  }

  private decode8Family(opcode: Opcode): Instruction {
    const operation = getN(opcode);

    switch (operation) {
      case 0x0:
        return {
          kind: "register-operation",
          opcode,
          operation: "assign",
          x: getX(opcode),
          y: getY(opcode),
        };

      case 0x1:
        return {
          kind: "register-operation",
          opcode,
          operation: "or",
          x: getX(opcode),
          y: getY(opcode),
        };

      case 0x2:
        return {
          kind: "register-operation",
          opcode,
          operation: "and",
          x: getX(opcode),
          y: getY(opcode),
        };

      case 0x3:
        return {
          kind: "register-operation",
          opcode,
          operation: "xor",
          x: getX(opcode),
          y: getY(opcode),
        };

      case 0x4:
        return {
          kind: "register-operation",
          opcode,
          operation: "add",
          x: getX(opcode),
          y: getY(opcode),
        };

      case 0x5:
        return {
          kind: "register-operation",
          opcode,
          operation: "subtract",
          x: getX(opcode),
          y: getY(opcode),
        };

      case 0x6:
        return {
          kind: "register-operation",
          opcode,
          operation: "shift-right",
          x: getX(opcode),
          y: getY(opcode),
        };

      case 0x7:
        return {
          kind: "register-operation",
          opcode,
          operation: "reverse-subtract",
          x: getX(opcode),
          y: getY(opcode),
        };

      case 0xe:
        return {
          kind: "register-operation",
          opcode,
          operation: "shift-left",
          x: getX(opcode),
          y: getY(opcode),
        };

      default:
        throw new InvalidOpcodeError(opcode);
    }
  }

  private decode9Family(opcode: Opcode): Instruction {
    if (getN(opcode) !== 0) {
      throw new InvalidOpcodeError(opcode);
    }

    return {
      kind: "skip-not-equal-register",
      opcode,
      x: getX(opcode),
      y: getY(opcode),
    };
  }

  private decodeEFamily(opcode: Opcode): Instruction {
    switch (getNN(opcode)) {
      case 0x9e:
        return {
          kind: "skip-key-pressed",
          opcode,
          register: getX(opcode),
        };

      case 0xa1:
        return {
          kind: "skip-key-not-pressed",
          opcode,
          register: getX(opcode),
        };

      default:
        throw new InvalidOpcodeError(opcode);
    }
  }

  private decodeFFamily(opcode: Opcode): Instruction {
    switch (getNN(opcode)) {
      case 0x07:
        return {
          kind: "get-delay-timer",
          opcode,
          register: getX(opcode),
        };

      case 0x0a:
        return {
          kind: "wait-for-key",
          opcode,
          register: getX(opcode),
        };

      case 0x15:
        return {
          kind: "set-delay-timer",
          opcode,
          register: getX(opcode),
        };

      case 0x18:
        return {
          kind: "set-sound-timer",
          opcode,
          register: getX(opcode),
        };

      case 0x1e:
        return {
          kind: "add-to-index",
          opcode,
          register: getX(opcode),
        };

      case 0x29:
        return {
          kind: "set-index-to-sprite",
          opcode,
          register: getX(opcode),
        };

      case 0x33:
        return {
          kind: "store-bcd",
          opcode,
          register: getX(opcode),
        };

      case 0x55:
        return {
          kind: "store-registers",
          opcode,
          register: getX(opcode),
        };

      case 0x65:
        return {
          kind: "load-registers",
          opcode,
          register: getX(opcode),
        };

      default:
        throw new InvalidOpcodeError(opcode);
    }
  }
}

export class InvalidOpcodeError extends Error {
  public constructor(public readonly opcode: Opcode) {
    super(`Invalid CHIP-8 opcode: 0x${opcode.toString(16).padStart(4, "0")}`);

    this.name = "InvalidOpcodeError";
  }
}
