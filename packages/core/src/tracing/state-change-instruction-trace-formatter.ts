import type { Address } from "../core/types/address.ts";
import type { Byte } from "../core/types/byte.ts";
import type { CpuState } from "../cpu/state/cpu-state.ts";
import type { InstructionTrace } from "./instruction-trace.ts";
import type { InstructionTraceFormatter } from "./instruction-trace-formatter.ts";

const STATE_CHANGE_SEPARATOR = " → ";

/**
 * Extends an instruction trace representation with CPU state changes.
 *
 * Only values that differ between the before and after snapshots are emitted.
 */
export class StateChangeInstructionTraceFormatter implements InstructionTraceFormatter {
  public constructor(private readonly baseFormatter: InstructionTraceFormatter) {}

  public format(trace: InstructionTrace): string {
    const base = this.baseFormatter.format(trace);
    const changes = this.formatChanges(trace.before, trace.after);

    if (changes.length === 0) {
      return base;
    }

    return `${base.padEnd(28)} | ${changes.join("; ")}`;
  }

  private formatChanges(before: CpuState, after: CpuState): readonly string[] {
    const changes: string[] = [];

    for (const [index, beforeValue] of before.registers.entries()) {
      const afterValue = after.registers[index];

      if (afterValue === undefined || beforeValue === afterValue) {
        continue;
      }

      changes.push(
        `V${index.toString(16).toUpperCase()}:${this.formatByte(
          beforeValue,
        )}${STATE_CHANGE_SEPARATOR}${this.formatByte(afterValue)}`,
      );
    }

    if (before.index !== after.index) {
      changes.push(
        `I :${this.formatAddress(before.index)}${STATE_CHANGE_SEPARATOR}${this.formatAddress(after.index)}`,
      );
    }

    if (before.programCounter !== after.programCounter) {
      changes.push(
        `PC:${this.formatAddress(before.programCounter)}${STATE_CHANGE_SEPARATOR}${this.formatAddress(
          after.programCounter,
        )}`,
      );
    }

    if (!this.areStacksEqual(before.stack, after.stack)) {
      changes.push(
        `STACK:${this.formatStack(before.stack)}${STATE_CHANGE_SEPARATOR}${this.formatStack(after.stack)}`,
      );
    }

    if (before.delayTimer !== after.delayTimer) {
      changes.push(
        `DT:${this.formatByte(before.delayTimer)}${STATE_CHANGE_SEPARATOR}${this.formatByte(after.delayTimer)}`,
      );
    }

    if (before.soundTimer !== after.soundTimer) {
      changes.push(
        `ST:${this.formatByte(before.soundTimer)}${STATE_CHANGE_SEPARATOR}${this.formatByte(after.soundTimer)}`,
      );
    }

    return changes;
  }

  private areStacksEqual(first: readonly Address[], second: readonly Address[]): boolean {
    return (
      first.length === second.length && first.every((value, index) => value === second[index])
    );
  }

  private formatStack(stack: readonly Address[]): string {
    return `[${stack.map((value) => this.formatAddress(value)).join(",")}]`;
  }

  private formatByte(value: Byte): string {
    return `0x${value.toString(16).toUpperCase().padStart(2, "0")}`;
  }

  private formatAddress(value: Address): string {
    return `0x${value.toString(16).toUpperCase().padStart(3, "0")}`;
  }
}
