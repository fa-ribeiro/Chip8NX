import type { Address } from "../core/types/address.ts";
import type { Opcode } from "../core/types/opcode.ts";
import type { InstructionFormatter } from "../disassembly/instruction-formatter.ts";
import type { InstructionTrace } from "./instruction-trace.ts";
import type { InstructionTraceFormatter } from "./instruction-trace-formatter.ts";

/**
 * Formats Classic CHIP-8 instruction traces as compact listing lines.
 *
 * @remarks
 * Instruction syntax is delegated to an {@link InstructionFormatter}; this
 * formatter owns only the trace-level representation of source address,
 * opcode, and instruction text.
 */
export class ClassicInstructionTraceFormatter
  implements InstructionTraceFormatter {
  /**
   * Creates a Classic CHIP-8 trace formatter.
   *
   * @param instructionFormatter - Formatter used for decoded instruction text.
   */
  public constructor(
    private readonly instructionFormatter: InstructionFormatter,
  ) {}

  /**
   * {@inheritDoc InstructionTraceFormatter.format}
   */
  public format(trace: InstructionTrace): string {
    return `${this.formatAddress(trace.before.programCounter)} ${
      this.formatOpcode(trace.instruction.opcode)
    } ${this.instructionFormatter.format(trace.instruction)}`;
  }

  private formatAddress(value: Address): string {
    return `0x${value.toString(16).toUpperCase().padStart(3, "0")}`;
  }

  private formatOpcode(value: Opcode): string {
    return value.toString(16).toUpperCase().padStart(4, "0");
  }
}
