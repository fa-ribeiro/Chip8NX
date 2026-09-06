/**
 * Chip8NX Core: modular, profile-driven CHIP-8 emulation.
 *
 * @module
 */

// Clock
export type { Clock } from "./src/clock/clock.ts";
export { PerformanceClock } from "./src/clock/performance-clock.ts";

// Core domain types
export { type Address, address } from "./src/core/types/address.ts";
export { type Byte, byte } from "./src/core/types/byte.ts";
export { type Duration, duration } from "./src/core/types/duration.ts";
export { Frequency } from "./src/core/types/frequency.ts";
export { type Key, key } from "./src/core/types/key.ts";
export { type Opcode, opcode } from "./src/core/types/opcode.ts";
export { type Timestamp, timestamp } from "./src/core/types/timestamp.ts";

// CPU
export { Cpu } from "./src/cpu/cpu.ts";
export type { ExecutionContext } from "./src/cpu/execution-context.ts";
export { IndexRegister } from "./src/cpu/index-register/index-register.ts";
export {
  InstructionExecutor,
  UnsupportedInstructionError,
} from "./src/cpu/instruction-executor.ts";
export { INSTRUCTION_SIZE, ProgramCounter } from "./src/cpu/program-counter/program-counter.ts";
export { type RegisterIndex, registerIndex } from "./src/cpu/registers/register-index.ts";
export { REGISTER_COUNT, Registers } from "./src/cpu/registers/registers.ts";
export { Stack } from "./src/cpu/stack/stack.ts";
export type { CpuState } from "./src/cpu/state/cpu-state.ts";

// Display
export { DisplayBuffer } from "./src/display/display-buffer.ts";
export { VerticalBlank } from "./src/display/vertical-blank.ts";
export type { Display } from "./src/display/display.ts";
export { NullDisplay } from "./src/display/null-display.ts";

// Font
export { CLASSIC_FONT_IMAGE } from "./src/font/classic-font-image.ts";
export {
  CLASSIC_FONT_GLYPH_COUNT,
  CLASSIC_FONT_GLYPH_SIZE,
  ClassicFont,
} from "./src/font/classic-font.ts";
export type { Font } from "./src/font/font.ts";

// Instructions
export { Decoder, InvalidOpcodeError } from "./src/instruction/decoder.ts";
export * from "./src/instruction/instruction.ts";

// Instruction formatting
export { ClassicInstructionFormatter } from "./src/instruction/formatting/classic-instruction-formatter.ts";
export type { InstructionFormatter } from "./src/instruction/formatting/instruction-formatter.ts";

// Disassembly
export type { DisassembledInstruction } from "./src/disassembly/disassembled-instruction.ts";
export { Disassembler } from "./src/disassembly/disassembler.ts";

// Tracing
export { ClassicInstructionTraceFormatter } from "./src/tracing/classic-instruction-trace-formatter.ts";
export { StateChangeInstructionTraceFormatter } from "./src/tracing/state-change-instruction-trace-formatter.ts";
export type { InstructionTraceFormatter } from "./src/tracing/instruction-trace-formatter.ts";
export type { InstructionTraceObserver } from "./src/tracing/instruction-trace-observer.ts";
export { InstructionTraceBuffer } from "./src/tracing/instruction-trace-buffer.ts";
export type {
  FailedInstructionTrace,
  InstructionTrace,
  SuccessfulInstructionTrace,
} from "./src/tracing/instruction-trace.ts";

// Keyboard
export type { Keyboard } from "./src/keyboard/keyboard.ts";
export { KeyboardState } from "./src/keyboard/keyboard-state.ts";

// Machine
export type { Chip8Profile } from "./src/machine/chip8-profile.ts";
export { CLASSIC_CHIP8_PROFILE } from "./src/machine/classic/classic-chip8-profile.ts";
export { MachineInitializer } from "./src/machine/machine-initializer.ts";

// Memory
export { MemoryImageLoader } from "./src/memory/memory-image-loader.ts";
export { MemoryImage } from "./src/memory/memory-image.ts";
export type { Memory } from "./src/memory/memory.ts";
export { Ram } from "./src/memory/ram.ts";

// Random
export { DefaultRandomNumberGenerator } from "./src/random/default-random-number-generator.ts";
export type { RandomNumberGenerator } from "./src/random/random-number-generator.ts";

// Runtime
export type { Chip8RuntimeConfiguration } from "./src/runtime/chip8-runtime-configuration.ts";
export { Chip8Runtime } from "./src/runtime/chip8-runtime.ts";

// Scheduling
export { Scheduler } from "./src/scheduler/scheduler.ts";

// Timers
export { Timer } from "./src/timer/timer.ts";
