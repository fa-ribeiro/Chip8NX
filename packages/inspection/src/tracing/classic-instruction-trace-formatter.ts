import type {
  Address,
  FailedInstructionTrace,
  InstructionTrace,
  Opcode,
  SuccessfulInstructionTrace,
} from "@chip8nx/core";

import type { InstructionFormatter } from "../instruction/formatting/instruction-formatter.ts";
import type { InstructionTraceFormatter } from "./instruction-trace-formatter.ts";

/**
 * Formats Classic CHIP-8 instruction traces as compact listing lines.
 *
 * @remarks
 * Instruction syntax is delegated to an {@link InstructionFormatter}; this
 * formatter owns only the trace-level representation of source address,
 * opcode, and instruction text.
 */
export class ClassicInstructionTraceFormatter implements InstructionTraceFormatter {
  /**
   * Creates a Classic CHIP-8 trace formatter.
   *
   * @param instructionFormatter - Formatter used for decoded instruction text.
   */
  public constructor(private readonly instructionFormatter: InstructionFormatter) {}

  /**
   * {@inheritDoc InstructionTraceFormatter.format}
   */
  public format(trace: InstructionTrace): string {
    return trace.outcome === "success" ? this.formatSuccess(trace) : this.formatFailure(trace);
  }

  private formatSuccess(trace: SuccessfulInstructionTrace): string {
    return `${this.formatAddress(trace.before.programCounter)} ${
      this.formatOpcode(
        trace.instruction.opcode,
      )
    } ${this.instructionFormatter.format(trace.instruction)}`;
  }

  private formatFailure(trace: FailedInstructionTrace): string {
    const address = this.formatAddress(trace.before.programCounter);
    const opcode = trace.opcode === undefined ? "????" : this.formatOpcode(trace.opcode);

    const operation = trace.instruction !== undefined
      ? this.instructionFormatter.format(trace.instruction)
      : trace.opcode === undefined
      ? "<fetch failed>"
      : "<decode failed>";

    return `${address} ${opcode} ${operation} [${this.formatError(trace.error)}]`;
  }

  private formatError(error: unknown): string {
    if (error instanceof Error) {
      return `${error.name}: ${error.message}`;
    }

    return String(error);
  }

  private formatAddress(value: Address): string {
    return `0x${value.toString(16).toUpperCase().padStart(3, "0")}`;
  }

  private formatOpcode(value: Opcode): string {
    return value.toString(16).toUpperCase().padStart(4, "0");
  }
}
