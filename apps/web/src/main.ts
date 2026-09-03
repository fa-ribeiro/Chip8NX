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
import { CanvasDisplay } from "./display/canvas-display.ts";
import "./style.css";

const CPU_FREQUENCY = Frequency.fromInteger(500n);

const romInput = document.querySelector<HTMLInputElement>("#rom-input");

const canvas = document.querySelector<HTMLCanvasElement>("#chip8-display");

const status = document.querySelector<HTMLElement>("#status");

if (romInput === null || canvas === null || status === null) {
  throw new Error("Required web application elements are missing.");
}

const display = new CanvasDisplay(canvas);

let animationFrameId: number | undefined;

romInput.addEventListener("change", () => {
  const rom = romInput.files?.[0];

  if (rom === undefined) {
    return;
  }

  void loadAndRun(rom);
});

async function loadAndRun(rom: File): Promise<void> {
  stopHostLoop();

  setStatus(`Loading ${rom.name}...`);

  try {
    const program = new MemoryImage(new Uint8Array(await rom.arrayBuffer()));

    const profile = CLASSIC_CHIP8_PROFILE;

    const delayTimer = new Timer();
    const soundTimer = new Timer();

    const verticalBlank = new VerticalBlank();

    const displayBuffer = new DisplayBuffer(profile.display.width, profile.display.height);

    /*
     * The first web milestone intentionally has no browser keyboard adapter.
     *
     * KeyboardState still provides the Core keyboard capability. Programs
     * requiring input will simply remain waiting until keyboard support is
     * introduced in a later web milestone.
     */
    const keyboard = new KeyboardState();

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

    runtime.resume();

    display.render(displayBuffer);

    setStatus(`Running ${rom.name}`);

    runHostLoop(runtime, displayBuffer);
  } catch (error) {
    setStatus(`Unable to run ROM: ${describeError(error)}`, true);

    console.error(error);
  }
}

function runHostLoop(runtime: Chip8Runtime, displayBuffer: DisplayBuffer): void {
  const frame = (): void => {
    try {
      /*
       * requestAnimationFrame controls only how often the browser host
       * observes the emulator.
       *
       * Chip8Runtime and its scheduler continue to own emulated CPU, timer,
       * and display-refresh timing.
       */
      runtime.tick();

      display.render(displayBuffer);

      animationFrameId = requestAnimationFrame(frame);
    } catch (error) {
      animationFrameId = undefined;

      setStatus(`Emulation stopped: ${describeError(error)}`, true);

      console.error(error);
    }
  };

  animationFrameId = requestAnimationFrame(frame);
}

function stopHostLoop(): void {
  if (animationFrameId === undefined) {
    return;
  }

  cancelAnimationFrame(animationFrameId);

  animationFrameId = undefined;
}

function setStatus(message: string, error = false): void {
  status.textContent = message;

  if (error) {
    status.dataset.state = "error";
  } else {
    delete status.dataset.state;
  }
}

function describeError(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
