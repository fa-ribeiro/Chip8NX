/**
 * Chip8NX Inspection: host-independent tools for passive CHIP-8 inspection.
 *
 * @module
 */

// Disassembly
export type { DisassembledInstruction } from "./src/disassembly/disassembled-instruction.ts";
export { Disassembler } from "./src/disassembly/disassembler.ts";

// Trace formatting
export { ClassicInstructionTraceFormatter } from "./src/tracing/classic-instruction-trace-formatter.ts";
export { StateChangeInstructionTraceFormatter } from "./src/tracing/state-change-instruction-trace-formatter.ts";
export type { InstructionTraceFormatter } from "./src/tracing/instruction-trace-formatter.ts";

// Trace buffer
export { InstructionTraceBuffer } from "./src/tracing/instruction-trace-buffer.ts";

// Instruction formatting
export { ClassicInstructionFormatter } from "./src/instruction/formatting/classic-instruction-formatter.ts";
export type { InstructionFormatter } from "./src/instruction/formatting/instruction-formatter.ts";
