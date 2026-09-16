import { assertEquals } from "@std/assert";

import {
  address,
  byte,
  CLASSIC_CHIP8_PROFILE,
  ClassicFont,
  Cpu,
  Decoder,
  DisplayBuffer,
  type ExecutionContext,
  ExitState,
  IndexRegister,
  InstructionExecutor,
  KeyboardState,
  MemoryImage,
  MemoryImageLoader,
  ProgramCounter,
  Ram,
  registerIndex,
  Registers,
  RplFlags,
  Stack,
  Timer,
  VerticalBlank,
} from "../../mod.ts";

import { TestRandomNumberGenerator } from "../../src/random/test-random-number-generator.ts";

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
    displayBuffer: new DisplayBuffer(profile.display.specification, "clip"),
    verticalBlank: new VerticalBlank(),
    keyboard: new KeyboardState(),
    font: new ClassicFont(profile.fontBaseAddress),
    randomNumberGenerator: new TestRandomNumberGenerator([byte(0)]),
    rplFlags: new RplFlags(),
    exitState: new ExitState(),
  };

  const cpu = new Cpu(
    context,
    new Decoder(),
    new InstructionExecutor(profile.instructionSet, profile.compatibility),
  );

  cpu.step();

  assertEquals(registers.get(registerIndex(0x0)), byte(0x42));

  assertEquals(context.programCounter.getValue(), address(0x202));

  cpu.step();

  assertEquals(registers.get(registerIndex(0x0)), byte(0x43));

  assertEquals(context.programCounter.getValue(), address(0x204));
});
