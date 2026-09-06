import {
  Chip8Runtime,
  CLASSIC_CHIP8_PROFILE,
  ClassicFont,
  ClassicInstructionFormatter,
  ClassicInstructionTraceFormatter,
  Cpu,
  Decoder,
  DefaultRandomNumberGenerator,
  DisplayBuffer,
  type ExecutionContext,
  Frequency,
  IndexRegister,
  InstructionExecutor,
  type InstructionTraceObserver,
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
  StateChangeInstructionTraceFormatter,
  Timer,
  VerticalBlank,
} from "@chip8nx/core";
import { StandardTerminalHost } from "./src/standard-terminal-host.ts";

const CPU_FREQUENCY = Frequency.fromInteger(500n);
const TRACE_FLAG = "--trace";

/**
 * Host presentation frequency.
 *
 * This controls only how often the terminal observes the framebuffer.
 * Emulated CHIP-8 display timing remains owned by Chip8Runtime and the
 * configured machine profile.
 */
const HOST_RENDER_INTERVAL_MS = 1_000 / 60;

const traceEnabled = Deno.args[0] === TRACE_FLAG;
const romPath = traceEnabled ? Deno.args[1] : Deno.args[0];
const expectedArgumentCount = traceEnabled ? 2 : 1;

if (romPath === undefined || Deno.args.length !== expectedArgumentCount) {
  console.error("Usage: deno task terminal [--trace] <rom-path>");
  Deno.exit(1);
}

const profile = CLASSIC_CHIP8_PROFILE;

const program = new MemoryImage(await Deno.readFile(romPath));

const delayTimer = new Timer();
const soundTimer = new Timer();

const verticalBlank = new VerticalBlank();
const displayBuffer = new DisplayBuffer(profile.display.width, profile.display.height);

const keyboardState = new KeyboardState();

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
  keyboard: keyboardState,
  font: new ClassicFont(profile.fontBaseAddress),
  randomNumberGenerator: new DefaultRandomNumberGenerator(),
};

const initializer = new MachineInitializer(new MemoryImageLoader());
initializer.initialize(context, profile, program);

const traceObserver = traceEnabled ? createConsoleTraceObserver() : undefined;
const cpu = new Cpu(context, new Decoder(), new InstructionExecutor(), traceObserver);
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

/*
 * The standard terminal presentation continuously redraws an alternate screen
 * on stdout. Trace mode disables only that presentation so the trace stream
 * remains readable; keyboard input and emulated execution are unchanged.
 */
const terminal = traceEnabled
  ? new StandardTerminalHost(keyboardState, {
    createPresentation: () => ({
      start(): void {},
      render(): void {},
      stop(): void {},
    }),
  })
  : new StandardTerminalHost(keyboardState);

const inputTask = terminal.start();

runtime.resume();

try {
  while (!terminal.quitRequested) {
    runtime.tick();

    terminal.tick();

    terminal.render(displayBuffer);

    await sleep(HOST_RENDER_INTERVAL_MS);
  }
} finally {
  await terminal.stop();
}

await inputTask;

function createConsoleTraceObserver(): InstructionTraceObserver {
  const instructionFormatter = new ClassicInstructionFormatter();

  const compactTraceFormatter = new ClassicInstructionTraceFormatter(instructionFormatter);

  const traceFormatter = new StateChangeInstructionTraceFormatter(compactTraceFormatter);

  return {
    observe(trace): void {
      console.log(traceFormatter.format(trace));
    },
  };
}

function sleep(milliseconds: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, milliseconds);
  });
}
