import {
  type Address,
  address,
  Decoder,
  INSTRUCTION_SIZE,
  type InstructionFormatter,
  type Memory,
  opcode,
} from "@chip8nx/core";

import type { DisassembledInstruction } from "./disassembled-instruction.ts";

/**
 * Disassembles CHIP-8 instructions from memory.
 *
 * Decoding is delegated to the configured {@link Decoder}, while textual
 * presentation is delegated to the configured {@link InstructionFormatter}.
 */
export class Disassembler {
  /**
   * Creates a disassembler using the supplied decoding and formatting
   * collaborators.
   *
   * @param decoder - Decoder used to translate opcodes into typed instructions.
   * @param formatter - Formatter used to produce human-readable instruction text.
   */
  public constructor(
    private readonly decoder: Decoder,
    private readonly formatter: InstructionFormatter,
  ) {}

  /**
   * Disassembles one CHIP-8 instruction at the specified memory address.
   *
   * @param memory - Memory containing the encoded instruction.
   * @param sourceAddress - Address of the instruction's first byte.
   * @returns The decoded and formatted instruction.
   *
   * @throws {InvalidOpcodeError} if the two-byte value is not a valid
   * CHIP-8 opcode.
   * @throws {@link RangeError} if either byte lies outside the memory address
   * space.
   */
  public disassembleAt(memory: Memory, sourceAddress: Address): DisassembledInstruction {
    const highByte = memory.read(sourceAddress);
    const lowByte = memory.read(address(sourceAddress + 1));
    const fetchedOpcode = opcode((highByte << 8) | lowByte);

    const instruction = this.decoder.decode(fetchedOpcode);
    const text = this.formatter.format(instruction);

    return {
      address: sourceAddress,
      instruction,
      text,
    };
  }

  /**
   * Disassembles complete CHIP-8 instructions from a memory range.
   *
   * Any unmatched trailing byte is ignored.
   *
   * @param memory - Memory containing the encoded instructions.
   * @param startAddress - Address of the first byte to inspect.
   * @param byteLength - Number of bytes in the range.
   * @returns The decoded and formatted instructions in address order.
   *
   * @throws {@link RangeError} if `byteLength` is not a non-negative safe
   * integer or if an instruction read extends beyond the memory address space.
   * @throws {InvalidOpcodeError} if any complete two-byte value is not a valid
   * CHIP-8 opcode.
   */
  public disassemble(
    memory: Memory,
    startAddress: Address,
    byteLength: number,
  ): readonly DisassembledInstruction[] {
    if (!Number.isSafeInteger(byteLength) || byteLength < 0) {
      throw new RangeError(
        `Byte length must be a non-negative safe integer, got ${byteLength}`,
      );
    }

    const instructions: DisassembledInstruction[] = [];

    for (let offset = 0; offset + INSTRUCTION_SIZE <= byteLength; offset += INSTRUCTION_SIZE) {
      const sourceAddress = address(startAddress + offset);

      instructions.push(this.disassembleAt(memory, sourceAddress));
    }

    return instructions;
  }
}
