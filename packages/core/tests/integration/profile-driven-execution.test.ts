import { assertEquals } from "@std/assert";

import {
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
  Stack,
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
      profile.display.width,
      profile.display.height,
      profile.compatibility.spriteOverflow,
    ),
    verticalBlank: new VerticalBlank(),
    keyboard: new KeyboardState(),
    font: new ClassicFont(profile.fontBaseAddress),
    randomNumberGenerator: new DefaultRandomNumberGenerator(),
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

  const cpu = new Cpu(context, new Decoder(), new InstructionExecutor(profile.compatibility));

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
