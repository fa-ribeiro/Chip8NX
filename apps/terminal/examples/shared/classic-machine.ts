import {
  Chip8Runtime,
  CLASSIC_CHIP8_PROFILE,
  ClassicFont,
  Cpu,
  Decoder,
  DefaultRandomNumberGenerator,
  DisplayBuffer,
  type ExecutionContext,
  Frequency,
  IndexRegister,
  InstructionExecutor,
  KeyboardState,
  MachineInitializer,
  MemoryImage,
  MemoryImageLoader,
  PerformanceClock,
  ProgramCounter,
  Ram,
  Registers,
  Scheduler,
  Stack,
  Timer,
  VerticalBlank,
} from "@chip8nx/core";

const CPU_FREQUENCY = Frequency.fromInteger(500n);

export interface ExampleMachine {
  readonly runtime: Chip8Runtime;
  readonly displayBuffer: DisplayBuffer;
  readonly keyboard: KeyboardState;
}

/**
 * Creates the same Classic CHIP-8 machine used by every terminal composition
 * example.
 *
 * Keeping machine construction shared ensures the examples differ only in
 * how the terminal host is assembled.
 */
export async function createExampleMachine(romPath: string): Promise<ExampleMachine> {
  const profile = CLASSIC_CHIP8_PROFILE;

  const program = new MemoryImage(await Deno.readFile(romPath));

  const delayTimer = new Timer();
  const soundTimer = new Timer();
  const verticalBlank = new VerticalBlank();
  const keyboard = new KeyboardState();

  const displayBuffer = new DisplayBuffer(
    profile.display.width,
    profile.display.height,
    profile.compatibility.spriteOverflow,
  );

  const context: ExecutionContext = {
    registers: new Registers(),
    memory: new Ram(profile.memorySize),
    stack: new Stack(profile.stackCapacity),
    programCounter: new ProgramCounter(profile.programStartAddress),
    indexRegister: new IndexRegister(),
    delayTimer,
    soundTimer,
    displayBuffer,
    verticalBlank,
    keyboard,
    font: new ClassicFont(profile.fontBaseAddress),
    randomNumberGenerator: new DefaultRandomNumberGenerator(),
  };

  const initializer = new MachineInitializer(new MemoryImageLoader());

  initializer.initialize(context, profile, program);

  const cpu = new Cpu(context, new Decoder(), new InstructionExecutor(profile.compatibility));

  const scheduler = new Scheduler(new PerformanceClock());

  const runtime = new Chip8Runtime(
    cpu,
    delayTimer,
    soundTimer,
    verticalBlank,
    scheduler,
    {
      cpuFrequency: CPU_FREQUENCY,
    },
    profile.timerFrequency,
    profile.display.refreshFrequency,
  );

  return {
    runtime,
    displayBuffer,
    keyboard,
  };
}
