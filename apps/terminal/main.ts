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

import { NoInputKeyboard } from "./src/no-input-keyboard.ts";
import { StdoutTerminalOutput } from "./src/stdout-terminal-output.ts";
import { TerminalDisplay } from "./src/terminal-display.ts";

const CPU_FREQUENCY = Frequency.fromInteger(500n);

/**
 * Host presentation frequency.
 *
 * This controls only how often the terminal observes DisplayBuffer. It does
 * not define CHIP-8 display timing; emulated display timing remains owned by
 * Chip8Runtime and the machine profile.
 */
const HOST_RENDER_INTERVAL_MS = 1_000 / 60;

const romPath = Deno.args[0];

if (romPath === undefined || Deno.args.length !== 1) {
  console.error("Usage: deno task terminal <rom-path>");
  Deno.exit(1);
}

const profile = CLASSIC_CHIP8_PROFILE;
const program = new MemoryImage(await Deno.readFile(romPath));

const delayTimer = new Timer();
const soundTimer = new Timer();
const verticalBlank = new VerticalBlank();
const displayBuffer = new DisplayBuffer(profile.display.width, profile.display.height);

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
  keyboard: new NoInputKeyboard(),
  font: new ClassicFont(profile.fontBaseAddress),
  randomNumberGenerator: new DefaultRandomNumberGenerator(),
};

const initializer = new MachineInitializer(new MemoryImageLoader());

initializer.initialize(context, profile, program);

const cpu = new Cpu(context, new Decoder(), new InstructionExecutor());

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

const display = new TerminalDisplay(new StdoutTerminalOutput());

runtime.resume();

while (true) {
  runtime.tick();
  display.render(displayBuffer);

  await sleep(HOST_RENDER_INTERVAL_MS);
}

function sleep(milliseconds: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, milliseconds);
  });
}
