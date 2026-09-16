import { address } from "../core/types/address.ts";
import { type Byte, byte } from "../core/types/byte.ts";
import type { Chip8Quirks } from "../machine/chip8-profile.ts";
import { key } from "../core/types/key.ts";
import type { Instruction } from "../instruction/instruction.ts";
import { add8, shiftLeft8, shiftRight8, subtract8 } from "./arithmetic/arithmetic.ts";
import type { ExecutionContext } from "./execution-context.ts";
import { registerIndex } from "./registers/register-index.ts";
import { INSTRUCTION_SIZE } from "./program-counter/program-counter.ts";
import type { SpriteDrawTiming } from "../machine/chip8-profile.ts";
import type { Chip8InstructionSet } from "../machine/chip8-profile.ts";
import { SpriteDrawResult } from "../display/display-buffer.ts";

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
  constructor(
    private readonly instructionSet: Chip8InstructionSet,
    private readonly quirks: Chip8Quirks,
  ) {} /**
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

      case "set-display-mode":
        this.requireSuperChipInstruction(instruction);

        context.displayBuffer.setMode(instruction.mode);
        return;

      case "scroll-display-down":
        this.requireSuperChipInstruction(instruction);

        if (instruction.rows === 0 && this.instructionSet.kind === "superchip-1.1") {
          context.exitState.exit();
          return;
        }

        context.displayBuffer.scrollDown(instruction.rows);
        return;

      case "scroll-display-horizontal":
        this.requireSuperChipInstruction(instruction);

        switch (instruction.direction) {
          case "right":
            context.displayBuffer.scrollRight(instruction.columns);
            return;

          case "left":
            context.displayBuffer.scrollLeft(instruction.columns);
            return;

          default:
            return assertNever(instruction.direction);
        }

      case "exit-interpreter":
        this.requireSuperChipInstruction(instruction);

        context.exitState.exit();
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
        const offsetRegister = this.quirks.jumpOffsetSource === "v0"
          ? registerIndex(0)
          : instruction.register;

        const offset = context.registers.get(offsetRegister);
        context.programCounter.setValue(address(instruction.address + offset));
        return;
      }

      case "random-and": {
        const randomValue = context.randomNumberGenerator.nextByte();

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

      case "skip-key-pressed": {
        const registerValue = context.registers.get(instruction.register);
        const keyValue = key(registerValue & 0x0f);

        if (context.keyboard.isPressed(keyValue)) {
          context.programCounter.advance();
        }

        return;
      }

      case "skip-key-not-pressed": {
        const registerValue = context.registers.get(instruction.register);
        const keyValue = key(registerValue & 0x0f);

        if (!context.keyboard.isPressed(keyValue)) {
          context.programCounter.advance();
        }

        return;
      }

      case "get-delay-timer":
        context.registers.set(instruction.register, context.delayTimer.getValue());
        return;

      case "set-delay-timer":
        context.delayTimer.setValue(context.registers.get(instruction.register));
        return;

      case "set-sound-timer":
        context.soundTimer.setValue(context.registers.get(instruction.register));
        return;

      case "wait-for-key": {
        const releasedKey = context.keyboard.pollKeyRelease();

        if (releasedKey === undefined) {
          context.programCounter.setValue(
            address(context.programCounter.getValue() - INSTRUCTION_SIZE),
          );
          return;
        }

        context.registers.set(instruction.register, byte(releasedKey));
        return;
      }

      case "add-to-index": {
        const value = context.registers.get(instruction.register);
        const index = context.indexRegister.getValue();
        const nextIndex = index + value;

        context.indexRegister.setValue(address(nextIndex));

        if (
          this.quirks.indexOverflow === "exit-interpreter" &&
          nextIndex >= context.memory.size
        ) {
          context.exitState.exit();
        }

        return;
      }

      case "set-index-to-sprite": {
        context.indexRegister.setValue(
          context.font.getSpriteAddress(context.registers.get(instruction.register), "small"),
        );
        return;
      }

      case "set-index-to-large-sprite":
        this.requireSuperChipInstruction(instruction);

        context.indexRegister.setValue(
          context.font.getSpriteAddress(context.registers.get(instruction.register), "large"),
        );
        return;

      case "store-bcd": {
        const value = context.registers.get(instruction.register);
        const startAddress = context.indexRegister.getValue();

        const hundreds = Math.floor(value / 100);
        const tens = Math.floor(value / 10) % 10;
        const ones = value % 10;

        context.memory.write(startAddress, byte(hundreds));
        context.memory.write(address(startAddress + 1), byte(tens));
        context.memory.write(address(startAddress + 2), byte(ones));

        return;
      }

      case "store-registers": {
        const startAddress = context.indexRegister.getValue();

        for (let index = 0; index <= instruction.register; index++) {
          context.memory.write(
            address(startAddress + index),
            context.registers.get(registerIndex(index)),
          );
        }

        switch (this.quirks.memoryTransferIndex) {
          case "increment-by-count":
            context.indexRegister.setValue(address(startAddress + instruction.register + 1));
            break;

          case "increment-by-x":
            context.indexRegister.setValue(address(startAddress + instruction.register));
            break;

          case "unchanged":
            break;
        }

        return;
      }

      case "load-registers": {
        const startAddress = context.indexRegister.getValue();

        for (let index = 0; index <= instruction.register; index++) {
          context.registers.set(
            registerIndex(index),
            context.memory.read(address(startAddress + index)),
          );
        }

        switch (this.quirks.memoryTransferIndex) {
          case "increment-by-count":
            context.indexRegister.setValue(address(startAddress + instruction.register + 1));
            break;

          case "increment-by-x":
            context.indexRegister.setValue(address(startAddress + instruction.register));
            break;

          case "unchanged":
            break;
        }
        return;
      }

      case "store-rpl-flags":
        this.requireSuperChipInstruction(instruction);

        for (let index = 0; index <= instruction.register; index++) {
          const register = registerIndex(index);

          context.rplFlags.set(register, context.registers.get(register));
        }
        return;

      case "load-rpl-flags":
        this.requireSuperChipInstruction(instruction);

        for (let index = 0; index <= instruction.register; index++) {
          const register = registerIndex(index);

          context.registers.set(register, context.rplFlags.get(register));
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
        this.executeDrawSprite(instruction, context);
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

        if (this.quirks.logicFlag === "reset") {
          context.registers.set(FLAG_REGISTER, byte(0));
        }

        return;

      case "and":
        context.registers.set(instruction.x, byte(x & y));

        if (this.quirks.logicFlag === "reset") {
          context.registers.set(FLAG_REGISTER, byte(0));
        }
        return;

      case "xor":
        context.registers.set(instruction.x, byte(x ^ y));

        if (this.quirks.logicFlag === "reset") {
          context.registers.set(FLAG_REGISTER, byte(0));
        }
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
        const source = this.quirks.shiftSource === "vx" ? x : y;
        const result = shiftRight8(source);

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
        const source = this.quirks.shiftSource === "vx" ? x : y;
        const result = shiftLeft8(source);

        context.registers.set(instruction.x, result.value);
        context.registers.set(FLAG_REGISTER, byte(result.flag ? 1 : 0));
        return;
      }
    }
  }

  private executeDrawSprite(
    instruction: Extract<Instruction, { kind: "draw-sprite" }>,
    context: ExecutionContext,
  ): void {
    const spriteDrawTiming = this.resolveSpriteDrawTiming(context.displayBuffer.mode);

    if (spriteDrawTiming === "vertical-blank" && !context.verticalBlank.consume()) {
      context.programCounter.setValue(
        address(context.programCounter.getValue() - INSTRUCTION_SIZE),
      );
      return;
    }

    const x = context.registers.get(instruction.x);
    const y = context.registers.get(instruction.y);
    const startAddress = context.indexRegister.getValue();

    const spriteForm = this.resolveSpriteDrawForm(instruction, context.displayBuffer.mode);

    const sprite: Byte[] = [];

    for (let offset = 0; offset < spriteForm.byteCount; offset++) {
      sprite.push(context.memory.read(address(startAddress + offset)));
    }

    const drawResult = spriteForm.wide
      ? context.displayBuffer.drawWideSprite(x, y, sprite)
      : context.displayBuffer.drawSprite(x, y, sprite);

    const collisionValue = this.resolveSpriteDrawFlag(drawResult, context.displayBuffer.mode);

    context.registers.set(FLAG_REGISTER, byte(collisionValue));
  }

  /**
   * Resolves the sprite-draw timing for the current display state.
   *
   * Uniform timing applies regardless of display mode. Mode-dependent timing
   * requires a display that exposes a SUPER-CHIP low/high mode.
   */
  private resolveSpriteDrawTiming(displayMode: "low" | "high" | null): SpriteDrawTiming {
    const behavior = this.quirks.spriteDrawTiming;

    switch (behavior.kind) {
      case "uniform":
        return behavior.timing;

      case "display-mode":
        if (displayMode === null) {
          throw new Error("Display-mode sprite timing requires a switchable display mode.");
        }

        return behavior[displayMode];

      default:
        return assertNever(behavior);
    }
  }

  private resolveSpriteDrawForm(
    instruction: Extract<Instruction, { kind: "draw-sprite" }>,
    displayMode: "low" | "high" | null,
  ): {
    readonly byteCount: number;
    readonly wide: boolean;
  } {
    const isSuperChipExtendedSprite = instruction.height === 0 &&
      this.instructionSet.kind === "superchip-1.1";

    if (isSuperChipExtendedSprite && displayMode === null) {
      throw new Error("SUPER-CHIP extended sprite drawing requires a switchable display mode.");
    }

    const wide = isSuperChipExtendedSprite && displayMode === "high";

    return {
      byteCount: isSuperChipExtendedSprite ? (wide ? 32 : 16) : instruction.height,

      wide,
    };
  }

  private resolveSpriteDrawFlag(
    drawResult: SpriteDrawResult,
    displayMode: "low" | "high" | null,
  ): number {
    const useAffectedRowCount = this.instructionSet.kind === "superchip-1.1" &&
      displayMode === "high";

    return useAffectedRowCount
      ? drawResult.collisionRows + drawResult.clippedBottomRows
      : drawResult.collision
      ? 1
      : 0;
  }

  private requireSuperChipInstruction(instruction: Instruction): void {
    if (this.instructionSet.kind !== "superchip-1.1") {
      throw new UnsupportedInstructionError(instruction);
    }
  }
}

/**
 * Thrown when the configured machine cannot execute a decoded instruction.
 *
 * This includes deliberately unsupported machine operations as well as
 * instruction semantics that are not implemented by the executor.
 */
export class UnsupportedInstructionError extends Error {
  public constructor(public readonly instruction: Instruction) {
    super(`Unsupported instruction: ${instruction.kind}`);
    this.name = "UnsupportedInstructionError";
  }
}

function assertNever(value: never): never {
  throw new Error(`Unexpected value: ${String(value)}`);
}
