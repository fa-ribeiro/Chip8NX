import { address } from "../core/types/address.ts";
import { opcode } from "../core/types/opcode.ts";
import { Decoder } from "../instruction/decoder.ts";
import type { ExecutionContext } from "./execution-context.ts";
import { InstructionExecutor } from "./instruction-executor.ts";
import type { CpuState } from "./state/cpu-state.ts";

/**
 * Executes the CHIP-8 fetch-decode-execute cycle.
 *
 * @remarks
 * A CPU instance operates on a single {@link ExecutionContext}. Each call to
 * {@link step} executes one CHIP-8 instruction:
 *
 * 1. Fetch the two-byte opcode at the current program counter.
 * 2. Advance the program counter to the following instruction.
 * 3. Decode the opcode.
 * 4. Execute the decoded instruction.
 *
 * The CPU deliberately does not own scheduling, timing, ROM loading, input
 * polling, rendering, or machine configuration. Those responsibilities
 * belong to higher-level components.
 */
export class Cpu {
  /**
   * Creates a CHIP-8 CPU.
   *
   * @param context - Machine resources used during instruction execution.
   * @param decoder - Decoder used to translate opcodes into instructions.
   * @param executor - Executor used to apply decoded instruction semantics.
   */
  public constructor(
    private readonly context: ExecutionContext,
    private readonly decoder: Decoder,
    private readonly executor: InstructionExecutor,
  ) {}

  /**
   * Fetches, decodes, and executes one CHIP-8 instruction.
   */
  public step(): void {
    const programCounter = this.context.programCounter.getValue();

    const highByte = this.context.memory.read(programCounter);
    const lowByte = this.context.memory.read(address(programCounter + 1));

    const fetchedOpcode = opcode((highByte << 8) | lowByte);

    this.context.programCounter.advance();

    const instruction = this.decoder.decode(fetchedOpcode);

    this.executor.execute(instruction, this.context);
  }

  /**
   * Returns a snapshot of the current CPU state.
   *
   * @remarks
   * Mutable collections such as the register bank and stack are copied by
   * their respective components. Consequently, subsequent CPU execution
   * cannot modify the returned snapshot.
   *
   * @returns The CPU state at the time this method is called.
   */
  public snapshot(): CpuState {
    return {
      registers: this.context.registers.snapshot(),
      index: this.context.indexRegister.getValue(),
      programCounter: this.context.programCounter.getValue(),
      stack: this.context.stack.snapshot(),
      delayTimer: this.context.delayTimer.getValue(),
      soundTimer: this.context.soundTimer.getValue(),
    };
  }
}
