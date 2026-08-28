import { address } from "../core/types/address.ts";
import { type Byte, byte } from "../core/types/byte.ts";
import type { Instruction } from "../instruction/instruction.ts";
import { DefaultRandomNumberGenerator } from "../random/default-random-number-generator.ts";
import type { RandomNumberGenerator } from "../random/random-number-generator.ts";
import { add8, shiftLeft8, shiftRight8, subtract8 } from "./arithmetic/arithmetic.ts";
import type { ExecutionContext } from "./execution-context.ts";
import { registerIndex } from "./registers/register-index.ts";

/**
 * Index of the CHIP-8 VF flag register.
 */
export const FLAG_REGISTER = registerIndex(0xf);

/**
 * Executes decoded CHIP-8 instructions against an execution context.
 *
 * The executor is deliberately unaware of opcode encoding. The decoder has
 * already translated the opcode into an Instruction, so this class is
 * responsible only for applying instruction semantics to the machine state.
 */
export class InstructionExecutor {
  public constructor(
    private readonly randomNumberGenerator: RandomNumberGenerator = new DefaultRandomNumberGenerator(),
  ) {}

  /**
   * Executes one decoded instruction.
   *
   * Normal instruction-pointer advancement is owned by the CPU cycle. This
   * method only performs program-counter changes that are explicit effects
   * of the instruction itself, such as jumps, calls, returns, and skips.
   */
  public execute(instruction: Instruction, context: ExecutionContext): void {
    switch (instruction.kind) {
      case "clear-screen":
        context.displayBuffer.clear();
        return;

      case "return":
        context.programCounter.setValue(context.stack.pop());
        return;

      case "jump":
        context.programCounter.setValue(instruction.address);
        return;

      case "call":
        context.stack.push(context.programCounter.getValue());
        context.programCounter.setValue(instruction.address);
        return;

      case "set-index":
        context.indexRegister.setValue(instruction.address);
        return;

      case "jump-with-offset": {
        const offset = context.registers.get(registerIndex(0));
        context.programCounter.setValue(address(instruction.address + offset));
        return;
      }

      case "random-and": {
        const randomValue = this.randomNumberGenerator.nextByte();

        context.registers.set(instruction.register, byte(randomValue & instruction.mask));
        return;
      }

      case "skip-equal-immediate":
        if (context.registers.get(instruction.register) === instruction.value) {
          context.programCounter.advance();
        }
        return;

      case "skip-not-equal-immediate":
        if (context.registers.get(instruction.register) !== instruction.value) {
          context.programCounter.advance();
        }
        return;

      case "skip-equal-register":
        if (context.registers.get(instruction.x) === context.registers.get(instruction.y)) {
          context.programCounter.advance();
        }
        return;

      case "skip-not-equal-register":
        if (context.registers.get(instruction.x) !== context.registers.get(instruction.y)) {
          context.programCounter.advance();
        }
        return;

      case "load-immediate":
        context.registers.set(instruction.register, instruction.value);
        return;

      case "add-immediate": {
        const result = add8(context.registers.get(instruction.register), instruction.value);

        context.registers.set(instruction.register, result.value);
        return;
      }

      case "register-operation":
        this.executeRegisterOperation(instruction, context);
        return;

      case "draw-sprite": {
        const x = context.registers.get(instruction.x);
        const y = context.registers.get(instruction.y);
        const startAddress = context.indexRegister.getValue();

        const sprite: Byte[] = [];

        for (let row = 0; row < instruction.height; row++) {
          sprite.push(context.memory.read(address(startAddress + row)));
        }

        const collision = context.displayBuffer.drawSprite(x, y, sprite);

        context.registers.set(FLAG_REGISTER, byte(collision ? 1 : 0));

        return;
      }

      default:
        throw new UnsupportedInstructionError(instruction);
    }
  }

  private executeRegisterOperation(
    instruction: Extract<Instruction, { kind: "register-operation" }>,
    context: ExecutionContext,
  ): void {
    const x = context.registers.get(instruction.x);
    const y = context.registers.get(instruction.y);

    switch (instruction.operation) {
      case "assign":
        context.registers.set(instruction.x, y);
        return;

      case "or":
        context.registers.set(instruction.x, byte(x | y));
        return;

      case "and":
        context.registers.set(instruction.x, byte(x & y));
        return;

      case "xor":
        context.registers.set(instruction.x, byte(x ^ y));
        return;

      case "add": {
        const result = add8(x, y);

        context.registers.set(instruction.x, result.value);
        context.registers.set(FLAG_REGISTER, byte(result.flag ? 1 : 0));
        return;
      }

      case "subtract": {
        const result = subtract8(x, y);

        context.registers.set(instruction.x, result.value);
        context.registers.set(FLAG_REGISTER, byte(result.flag ? 1 : 0));
        return;
      }

      case "shift-right": {
        const result = shiftRight8(x);

        context.registers.set(instruction.x, result.value);
        context.registers.set(FLAG_REGISTER, byte(result.flag ? 1 : 0));
        return;
      }

      case "reverse-subtract": {
        const result = subtract8(y, x);

        context.registers.set(instruction.x, result.value);
        context.registers.set(FLAG_REGISTER, byte(result.flag ? 1 : 0));
        return;
      }

      case "shift-left": {
        const result = shiftLeft8(x);

        context.registers.set(instruction.x, result.value);
        context.registers.set(FLAG_REGISTER, byte(result.flag ? 1 : 0));
        return;
      }
    }
  }
}

/**
 * Thrown when the executor receives an instruction whose execution semantics
 * have not yet been implemented.
 */
export class UnsupportedInstructionError extends Error {
  public constructor(public readonly instruction: Instruction) {
    super(`Unsupported instruction: ${instruction.kind}`);
    this.name = "UnsupportedInstructionError";
  }
}
