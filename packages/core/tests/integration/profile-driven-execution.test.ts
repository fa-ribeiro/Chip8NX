import { assertEquals } from "@std/assert";

import {
  address,
  byte,
  CHIP48_PROFILE,
  type Chip8Profile,
  CLASSIC_CHIP8_PROFILE,
  ClassicFont,
  Cpu,
  Decoder,
  DefaultRandomNumberGenerator,
  DisplayBuffer,
  type ExecutionContext,
  ExitState,
  IndexRegister,
  InstructionExecutor,
  KeyboardState,
  MachineInitializer,
  MemoryImage,
  MemoryImageLoader,
  ProgramCounter,
  Ram,
  registerIndex,
  Registers,
  RplFlags,
  Stack,
  SUPERCHIP_PROFILE,
  SuperChipFont,
  Timer,
  VerticalBlank,
} from "../../mod.ts";

interface TestMachine {
  readonly cpu: Cpu;
  readonly context: ExecutionContext;
}

function createMachine(profile: Chip8Profile): TestMachine {
  const context: ExecutionContext = {
    registers: new Registers(),
    memory: new Ram(profile.memorySize),
    stack: new Stack(profile.stackCapacity),
    programCounter: new ProgramCounter(profile.programStartAddress),
    indexRegister: new IndexRegister(),
    soundTimer: new Timer(),
    delayTimer: new Timer(),
    displayBuffer: new DisplayBuffer(
      profile.display.specification,
      profile.quirks.spriteOverflow,
    ),
    verticalBlank: new VerticalBlank(),
    keyboard: new KeyboardState(),
    font: profile.fonts.large === null
      ? new ClassicFont(profile.fonts.small.baseAddress)
      : new SuperChipFont(profile.fonts.small.baseAddress, profile.fonts.large.baseAddress),
    randomNumberGenerator: new DefaultRandomNumberGenerator(),
    rplFlags: new RplFlags(),
    exitState: new ExitState(),
  };

  /*
   * The same program is used for both profiles:
   *
   *     LD  VA, 0x83
   *     LD  VB, 0x04
   *     SHR VA, VB
   *
   * Classic CHIP-8 shifts VB into VA.
   * CHIP-48 shifts VA itself.
   */
  const program = new MemoryImage([0x6a, 0x83, 0x6b, 0x04, 0x8a, 0xb6]);

  const initializer = new MachineInitializer(new MemoryImageLoader());

  initializer.initialize(context, profile, program);

  const cpu = new Cpu(
    context,
    new Decoder(),
    new InstructionExecutor(profile.instructionSet, profile.quirks),
  );

  return { cpu, context };
}

Deno.test("machine composition applies profile-specific shift semantics", () => {
  const classic = createMachine(CLASSIC_CHIP8_PROFILE);
  const chip48 = createMachine(CHIP48_PROFILE);

  for (let step = 0; step < 3; step++) {
    classic.cpu.step();
    chip48.cpu.step();
  }

  assertEquals(classic.context.registers.get(registerIndex(0xa)), byte(0x02));
  assertEquals(classic.context.registers.get(registerIndex(0xf)), byte(0));

  assertEquals(chip48.context.registers.get(registerIndex(0xa)), byte(0x41));
  assertEquals(chip48.context.registers.get(registerIndex(0xf)), byte(1));
});

Deno.test("public API composes SUPER-CHIP display, large font, and exit semantics", () => {
  const machine = createMachine(SUPERCHIP_PROFILE);

  const program = new MemoryImage([
    0x00,
    0xff, // HIGH
    0x60,
    0x03, // LD V0, 0x03
    0xf0,
    0x30, // LD HF, V0
    0x00,
    0xfd, // EXIT
  ]);

  const initializer = new MachineInitializer(new MemoryImageLoader());
  initializer.initialize(machine.context, SUPERCHIP_PROFILE, program);

  for (let step = 0; step < 4; step++) {
    machine.cpu.step();
  }

  assertEquals(machine.context.displayBuffer.mode, "high");
  assertEquals(machine.context.displayBuffer.width, 128);
  assertEquals(machine.context.displayBuffer.height, 64);
  const largeFont = SUPERCHIP_PROFILE.fonts.large;

  if (largeFont === null) {
    throw new Error("SUPER-CHIP profile must provide a large font.");
  }

  assertEquals(machine.context.indexRegister.getValue(), address(largeFont.baseAddress + 30));
  assertEquals(machine.context.exitState.isExited, true);

  const exitedProgramCounter = machine.context.programCounter.getValue();
  machine.cpu.step();
  assertEquals(machine.context.programCounter.getValue(), exitedProgramCounter);
});
