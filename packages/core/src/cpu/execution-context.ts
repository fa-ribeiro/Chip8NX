import type { IndexRegister } from "./index-register/index-register.ts";
import type { Memory } from "../memory/memory.ts";
import type { ProgramCounter } from "./program-counter/program-counter.ts";
import type { Registers } from "./registers/registers.ts";
import type { Stack } from "./stack/stack.ts";
import type { Timer } from "../timer/timer.ts";
import type { DisplayBuffer } from "../display/display-buffer.ts";
import type { VerticalBlank } from "../display/vertical-blank.ts";
import type { Keyboard } from "../keyboard/keyboard.ts";
import type { Font } from "../font/font.ts";
import type { RandomNumberGenerator } from "../random/random-number-generator.ts";
import type { ExitState } from "../machine/exit-state.ts";
import type { RplFlags } from "../machine/rpl-flags.ts";

/**
 * Groups the mutable machine state and capabilities required by instruction execution.
 *
 * @remarks
 * The context does not construct, own, or reset its collaborators. Hosts compose the
 * object graph and {@link MachineInitializer} establishes resettable machine state.
 * Profile semantics are supplied separately to the instruction executor.
 */
export interface ExecutionContext {
  readonly registers: Registers;
  readonly memory: Memory;
  readonly stack: Stack;
  readonly programCounter: ProgramCounter;
  readonly indexRegister: IndexRegister;
  readonly soundTimer: Timer;
  readonly delayTimer: Timer;
  readonly displayBuffer: DisplayBuffer;
  readonly verticalBlank: VerticalBlank;
  readonly keyboard: Keyboard;
  readonly font: Font;
  readonly randomNumberGenerator: RandomNumberGenerator;
  readonly rplFlags: RplFlags;
  readonly exitState: ExitState;
}
