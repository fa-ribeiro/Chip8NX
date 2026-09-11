import type { Address, Instruction, RegisterIndex } from "@chip8nx/core";

import { ClassicInstructionFormatter } from "./classic-instruction-formatter.ts";
import type { InstructionFormatter } from "./instruction-formatter.ts";

/**
 * Formats CHIP-48 instructions using CHIP-48-compatible assembly notation.
 *
 * @remarks
 * Instructions whose presentation is unchanged are delegated to the
 * Classic CHIP-8 formatter.
 */
export class Chip48InstructionFormatter implements InstructionFormatter {
  private readonly classic = new ClassicInstructionFormatter();

  public format(instruction: Instruction): string {
    if (instruction.kind === "jump-with-offset") {
      return `JP ${this.formatRegister(instruction.register)}, ${
        this.formatAddress(
          instruction.address,
        )
      }`;
    }

    if (instruction.kind === "register-operation") {
      switch (instruction.operation) {
        case "shift-right":
          return `SHR ${this.formatRegister(instruction.x)}`;

        case "shift-left":
          return `SHL ${this.formatRegister(instruction.x)}`;
      }
    }

    return this.classic.format(instruction);
  }

  private formatRegister(register: RegisterIndex): string {
    return `V${register.toString(16).toUpperCase()}`;
  }

  private formatAddress(value: Address): string {
    return `0x${value.toString(16).toUpperCase().padStart(3, "0")}`;
  }
}
