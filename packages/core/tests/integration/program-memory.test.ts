import { assertEquals } from "@std/assert";

import { address } from "../../src/core/types/address.ts";
import { byte } from "../../src/core/types/byte.ts";
import { DisplayBuffer } from "../../src/display/display-buffer.ts";
import { VerticalBlank } from "../../src/display/vertical-blank.ts";
import { ClassicFont } from "../../src/font/classic-font.ts";
import { Decoder } from "../../src/instruction/decoder.ts";
import { TestKeyboard } from "../../src/keyboard/test-keyboard.ts";
import { MemoryImage } from "../../src/memory/memory-image.ts";
import { MemoryImageLoader } from "../../src/memory/memory-image-loader.ts";
import { Ram } from "../../src/memory/ram.ts";
import { TestRandomNumberGenerator } from "../../src/random/test-random-number-generator.ts";
import { Timer } from "../../src/timer/timer.ts";
import { Cpu } from "../../src/cpu/cpu.ts";
import type { ExecutionContext } from "../../src/cpu/execution-context.ts";
import { IndexRegister } from "../../src/cpu/index-register/index-register.ts";
import { InstructionExecutor } from "../../src/cpu/instruction-executor.ts";
import { ProgramCounter } from "../../src/cpu/program-counter/program-counter.ts";
import { registerIndex } from "../../src/cpu/registers/register-index.ts";
import { Registers } from "../../src/cpu/registers/registers.ts";
import { Stack } from "../../src/cpu/stack/stack.ts";
import { CLASSIC_CHIP8_PROFILE } from "../../src/machine/classic/classic-chip8-profile.ts";

Deno.test("CPU executes a program loaded into memory from a MemoryImage", () => {
  const profile = CLASSIC_CHIP8_PROFILE;
  const programStartAddress = address(profile.programStartAddress);

  const program = new MemoryImage([
    0x60,
    0x42, // LD V0, 0x42
    0x70,
    0x01, // ADD V0, 0x01
  ]);

  const memory = new Ram(profile.memorySize);
  const registers = new Registers();

  const loader = new MemoryImageLoader();

  loader.load(memory, programStartAddress, program);

  const context: ExecutionContext = {
    registers,
    memory,
    stack: new Stack(profile.stackCapacity),
    programCounter: new ProgramCounter(profile.programStartAddress),
    indexRegister: new IndexRegister(),
    soundTimer: new Timer(),
    delayTimer: new Timer(),
    displayBuffer: new DisplayBuffer(profile.display.width, profile.display.height),
    verticalBlank: new VerticalBlank(),
    keyboard: new TestKeyboard(),
    font: new ClassicFont(profile.fontBaseAddress),
    randomNumberGenerator: new TestRandomNumberGenerator([byte(0)]),
  };

  const cpu = new Cpu(context, new Decoder(), new InstructionExecutor());

  cpu.step();

  assertEquals(registers.get(registerIndex(0x0)), byte(0x42));

  assertEquals(context.programCounter.getValue(), address(0x202));

  cpu.step();

  assertEquals(registers.get(registerIndex(0x0)), byte(0x43));

  assertEquals(context.programCounter.getValue(), address(0x204));
});
