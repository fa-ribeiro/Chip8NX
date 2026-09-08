import {
  address,
  CLASSIC_CHIP8_PROFILE,
  ClassicInstructionFormatter,
  Decoder,
  InvalidOpcodeError,
  MemoryImage,
  MemoryImageLoader,
  Ram,
} from "@chip8nx/core";

import { Disassembler } from "@chip8nx/inspection";

const romPath = Deno.args[0];

if (romPath === undefined || Deno.args.length !== 1) {
  console.error("Usage: deno task disassemble <rom-path>");
  Deno.exit(1);
}

const profile = CLASSIC_CHIP8_PROFILE;

const program = new MemoryImage(await Deno.readFile(romPath));

const memory = new Ram(profile.memorySize);

new MemoryImageLoader().load(memory, profile.programStartAddress, program);

const disassembler = new Disassembler(new Decoder(), new ClassicInstructionFormatter());

for (let offset = 0; offset + 1 < program.bytes.length; offset += 2) {
  const sourceAddress = address(profile.programStartAddress + offset);

  try {
    const entry = disassembler.disassembleAt(memory, sourceAddress);

    console.log(
      `${formatAddress(entry.address)}  ` +
        `${formatOpcode(entry.instruction.opcode)}  ` +
        entry.text,
    );
  } catch (error) {
    if (error instanceof InvalidOpcodeError) {
      console.log(
        `${formatAddress(sourceAddress)}  ` + `${formatOpcode(error.opcode)}  ` + "UNKNOWN",
      );

      continue;
    }

    throw error;
  }
}

function formatAddress(value: number): string {
  return `0x${value.toString(16).toUpperCase().padStart(3, "0")}`;
}

function formatOpcode(value: number): string {
  return value.toString(16).toUpperCase().padStart(4, "0");
}
