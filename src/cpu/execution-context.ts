import type { IndexRegister } from "./index-register/index-register.ts";
import type { Memory } from "../memory/memory.ts";
import type { ProgramCounter } from "./program-counter/program-counter.ts";
import type { Registers } from "./registers/registers.ts";
import type { Stack } from "./stack/stack.ts";
import type { Timer } from "../timer/timer.ts";
import type { DisplayBuffer } from "../display/display-buffer.ts";
import type { Keyboard } from "../keyboard/keyboard.ts";

export interface ExecutionContext {
  readonly registers: Registers;
  readonly memory: Memory;
  readonly stack: Stack;
  readonly programCounter: ProgramCounter;
  readonly indexRegister: IndexRegister;
  readonly soundTimer: Timer;
  readonly delayTimer: Timer;
  readonly displayBuffer: DisplayBuffer;
  readonly keyboard: Keyboard;
}
