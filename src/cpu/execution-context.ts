import type { IndexRegister } from "../cpu/index-register/index-register.ts";
import type { Memory } from "../memory/memory.ts";
import type { ProgramCounter } from "../cpu/program-counter/program-counter.ts";
import type { Registers } from "../cpu/registers/registers.ts";
import type { Stack } from "../cpu/stack/stack.ts";
import type { Timer } from "../timer/timer.ts";
import { DisplayBuffer } from "../display/display-buffer.ts";

export interface ExecutionContext {
  readonly registers: Registers;
  readonly memory: Memory;
  readonly stack: Stack;
  readonly programCounter: ProgramCounter;
  readonly indexRegister: IndexRegister;
  readonly soundTimer: Timer;
  readonly delayTimer: Timer;
  readonly displayBuffer: DisplayBuffer;
}
