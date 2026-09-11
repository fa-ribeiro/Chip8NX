import type { Address } from "../core/types/address.ts";
import type { Byte } from "../core/types/byte.ts";
import type { Opcode } from "../core/types/opcode.ts";
import type { RegisterIndex } from "../cpu/registers/register-index.ts";

export interface ClearScreenInstruction {
  readonly kind: "clear-screen";
  readonly opcode: Opcode;
}

export interface ReturnInstruction {
  readonly kind: "return";
  readonly opcode: Opcode;
}

/**
 * Represents the Classic `0mmm` native system-call instruction.
 *
 * @remarks
 * On the COSMAC VIP this transfers execution to a native CDP1802
 * subroutine. Chip8NX preserves the decoded instruction identity, but the
 * generic CHIP-8 core does not emulate CDP1802 machine code. Execution of
 * this instruction is therefore intentionally unsupported.
 */
export interface SystemCallInstruction {
  readonly kind: "system-call";
  readonly opcode: Opcode;
  readonly address: Address;
}

export interface JumpInstruction {
  readonly kind: "jump";
  readonly opcode: Opcode;
  readonly address: Address;
}

export interface CallInstruction {
  readonly kind: "call";
  readonly opcode: Opcode;
  readonly address: Address;
}

export interface SkipEqualImmediateInstruction {
  readonly kind: "skip-equal-immediate";
  readonly opcode: Opcode;
  readonly register: RegisterIndex;
  readonly value: Byte;
}

export interface SkipNotEqualImmediateInstruction {
  readonly kind: "skip-not-equal-immediate";
  readonly opcode: Opcode;
  readonly register: RegisterIndex;
  readonly value: Byte;
}

export interface SkipEqualRegisterInstruction {
  readonly kind: "skip-equal-register";
  readonly opcode: Opcode;
  readonly x: RegisterIndex;
  readonly y: RegisterIndex;
}

export interface LoadImmediateInstruction {
  readonly kind: "load-immediate";
  readonly opcode: Opcode;
  readonly register: RegisterIndex;
  readonly value: Byte;
}

export interface AddImmediateInstruction {
  readonly kind: "add-immediate";
  readonly opcode: Opcode;
  readonly register: RegisterIndex;
  readonly value: Byte;
}

export type RegisterOperation =
  | "assign"
  | "or"
  | "and"
  | "xor"
  | "add"
  | "subtract"
  | "shift-right"
  | "reverse-subtract"
  | "shift-left";

export interface RegisterOperationInstruction {
  readonly kind: "register-operation";
  readonly opcode: Opcode;
  readonly operation: RegisterOperation;
  readonly x: RegisterIndex;
  readonly y: RegisterIndex;
}

export interface SkipNotEqualRegisterInstruction {
  readonly kind: "skip-not-equal-register";
  readonly opcode: Opcode;
  readonly x: RegisterIndex;
  readonly y: RegisterIndex;
}

export interface SetIndexInstruction {
  readonly kind: "set-index";
  readonly opcode: Opcode;
  readonly address: Address;
}

export interface JumpWithOffsetInstruction {
  readonly kind: "jump-with-offset";
  readonly opcode: Opcode;

  /**
   * X register encoded by the instruction.
   *
   * Classic BNNN semantics ignore this register and use V0 as the offset.
   * Compatible variants may use Vx instead.
   */
  readonly register: RegisterIndex;
  readonly address: Address;
}

export interface RandomAndInstruction {
  readonly kind: "random-and";
  readonly opcode: Opcode;
  readonly register: RegisterIndex;
  readonly mask: Byte;
}

export interface DrawInstruction {
  readonly kind: "draw-sprite";
  readonly opcode: Opcode;
  readonly x: RegisterIndex;
  readonly y: RegisterIndex;
  readonly height: number;
}

export interface SkipKeyPressedInstruction {
  readonly kind: "skip-key-pressed";
  readonly opcode: Opcode;
  readonly register: RegisterIndex;
}

export interface SkipKeyNotPressedInstruction {
  readonly kind: "skip-key-not-pressed";
  readonly opcode: Opcode;
  readonly register: RegisterIndex;
}

export interface GetDelayTimerInstruction {
  readonly kind: "get-delay-timer";
  readonly opcode: Opcode;
  readonly register: RegisterIndex;
}

export interface WaitForKeyInstruction {
  readonly kind: "wait-for-key";
  readonly opcode: Opcode;
  readonly register: RegisterIndex;
}

export interface SetDelayTimerInstruction {
  readonly kind: "set-delay-timer";
  readonly opcode: Opcode;
  readonly register: RegisterIndex;
}

export interface SetSoundTimerInstruction {
  readonly kind: "set-sound-timer";
  readonly opcode: Opcode;
  readonly register: RegisterIndex;
}

export interface AddToIndexInstruction {
  readonly kind: "add-to-index";
  readonly opcode: Opcode;
  readonly register: RegisterIndex;
}

export interface SetIndexToSpriteInstruction {
  readonly kind: "set-index-to-sprite";
  readonly opcode: Opcode;
  readonly register: RegisterIndex;
}

export interface StoreBcdInstruction {
  readonly kind: "store-bcd";
  readonly opcode: Opcode;
  readonly register: RegisterIndex;
}

export interface StoreRegistersInstruction {
  readonly kind: "store-registers";
  readonly opcode: Opcode;
  readonly register: RegisterIndex;
}

export interface LoadRegistersInstruction {
  readonly kind: "load-registers";
  readonly opcode: Opcode;
  readonly register: RegisterIndex;
}

export type Instruction =
  | ClearScreenInstruction
  | ReturnInstruction
  | SystemCallInstruction
  | JumpInstruction
  | CallInstruction
  | SkipEqualImmediateInstruction
  | SkipNotEqualImmediateInstruction
  | SkipEqualRegisterInstruction
  | LoadImmediateInstruction
  | AddImmediateInstruction
  | RegisterOperationInstruction
  | SkipNotEqualRegisterInstruction
  | SetIndexInstruction
  | JumpWithOffsetInstruction
  | RandomAndInstruction
  | DrawInstruction
  | SkipKeyPressedInstruction
  | SkipKeyNotPressedInstruction
  | GetDelayTimerInstruction
  | WaitForKeyInstruction
  | SetDelayTimerInstruction
  | SetSoundTimerInstruction
  | AddToIndexInstruction
  | SetIndexToSpriteInstruction
  | StoreBcdInstruction
  | StoreRegistersInstruction
  | LoadRegistersInstruction;
