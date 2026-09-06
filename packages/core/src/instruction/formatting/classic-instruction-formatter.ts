import type { Address } from "../../core/types/address.ts";
import type { Byte } from "../../core/types/byte.ts";
import type { RegisterIndex } from "../../cpu/registers/register-index.ts";
import type { Instruction, RegisterOperationInstruction } from "../instruction.ts";
import type { InstructionFormatter } from "./instruction-formatter.ts";

/**
 * Formats Classic CHIP-8 instructions using conventional CHIP-8 assembly
 * notation.
 */
export class ClassicInstructionFormatter implements InstructionFormatter {
  /**
   * {@inheritDoc InstructionFormatter.format}
   */
  public format(instruction: Instruction): string {
    switch (instruction.kind) {
      case "clear-screen":
        return "CLS";

      case "return":
        return "RET";

      case "system-call":
        return `SYS ${this.formatAddress(instruction.address)}`;

      case "jump":
        return `JP ${this.formatAddress(instruction.address)}`;

      case "call":
        return `CALL ${this.formatAddress(instruction.address)}`;

      case "skip-equal-immediate":
        return `SE ${this.formatRegister(instruction.register)}, ${
          this.formatByte(
            instruction.value,
          )
        }`;

      case "skip-not-equal-immediate":
        return `SNE ${this.formatRegister(instruction.register)}, ${
          this.formatByte(
            instruction.value,
          )
        }`;

      case "skip-equal-register":
        return `SE ${this.formatRegister(instruction.x)}, ${
          this.formatRegister(
            instruction.y,
          )
        }`;

      case "load-immediate":
        return `LD ${this.formatRegister(instruction.register)}, ${
          this.formatByte(
            instruction.value,
          )
        }`;

      case "add-immediate":
        return `ADD ${this.formatRegister(instruction.register)}, ${
          this.formatByte(
            instruction.value,
          )
        }`;

      case "register-operation":
        return this.formatRegisterOperation(instruction);

      case "skip-not-equal-register":
        return `SNE ${this.formatRegister(instruction.x)}, ${
          this.formatRegister(
            instruction.y,
          )
        }`;

      case "set-index":
        return `LD I, ${this.formatAddress(instruction.address)}`;

      case "jump-with-offset":
        return `JP V0, ${this.formatAddress(instruction.address)}`;

      case "random-and":
        return `RND ${this.formatRegister(instruction.register)}, ${
          this.formatByte(
            instruction.mask,
          )
        }`;

      case "draw-sprite":
        return `DRW ${this.formatRegister(instruction.x)}, ${
          this.formatRegister(
            instruction.y,
          )
        }, ${this.formatNibble(instruction.height)}`;

      case "skip-key-pressed":
        return `SKP ${this.formatRegister(instruction.register)}`;

      case "skip-key-not-pressed":
        return `SKNP ${this.formatRegister(instruction.register)}`;

      case "get-delay-timer":
        return `LD ${this.formatRegister(instruction.register)}, DT`;

      case "wait-for-key":
        return `LD ${this.formatRegister(instruction.register)}, K`;

      case "set-delay-timer":
        return `LD DT, ${this.formatRegister(instruction.register)}`;

      case "set-sound-timer":
        return `LD ST, ${this.formatRegister(instruction.register)}`;

      case "add-to-index":
        return `ADD I, ${this.formatRegister(instruction.register)}`;

      case "set-index-to-sprite":
        return `LD F, ${this.formatRegister(instruction.register)}`;

      case "store-bcd":
        return `LD B, ${this.formatRegister(instruction.register)}`;

      case "store-registers":
        return `LD [I], ${this.formatRegister(instruction.register)}`;

      case "load-registers":
        return `LD ${this.formatRegister(instruction.register)}, [I]`;

      default:
        return assertNever(instruction);
    }
  }

  private formatRegisterOperation(instruction: RegisterOperationInstruction): string {
    const x = this.formatRegister(instruction.x);
    const y = this.formatRegister(instruction.y);
    const operation = instruction.operation;

    switch (operation) {
      case "assign":
        return `LD ${x}, ${y}`;

      case "or":
        return `OR ${x}, ${y}`;

      case "and":
        return `AND ${x}, ${y}`;

      case "xor":
        return `XOR ${x}, ${y}`;

      case "add":
        return `ADD ${x}, ${y}`;

      case "subtract":
        return `SUB ${x}, ${y}`;

      case "shift-right":
        return `SHR ${x}, ${y}`;

      case "reverse-subtract":
        return `SUBN ${x}, ${y}`;

      case "shift-left":
        return `SHL ${x}, ${y}`;

      default:
        return assertNever(operation);
    }
  }

  private formatRegister(register: RegisterIndex): string {
    return `V${register.toString(16).toUpperCase()}`;
  }

  private formatByte(value: Byte): string {
    return `0x${value.toString(16).toUpperCase().padStart(2, "0")}`;
  }

  private formatAddress(value: Address): string {
    return `0x${value.toString(16).toUpperCase().padStart(3, "0")}`;
  }

  private formatNibble(value: number): string {
    return `0x${value.toString(16).toUpperCase()}`;
  }
}

function assertNever(value: never): never {
  throw new Error(`Unexpected value: ${String(value)}`);
}
