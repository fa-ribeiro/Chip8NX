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

import {
  ClassicInstructionFormatter,
  ClassicInstructionTraceFormatter,
  Disassembler,
  InstructionTraceBuffer,
} from "@chip8nx/inspection";

import { CanvasDisplay } from "./display/canvas-display.ts";
import { BrowserKeyboard } from "./keyboard/browser-keyboard.ts";
import { KeyboardInputHub } from "./keyboard/keyboard-input-hub.ts";
import { VirtualKeypad } from "./keyboard/virtual-keypad.ts";
import { WebAudioBeeper } from "./audio/web-audio-beeper.ts";
import {
  createWebInspectionViewModel,
  type CurrentInstructionInspection,
  type WebInspectionViewModel,
} from "./inspection/web-inspection-view-model.ts";
import { WebInspectionRenderer } from "./inspection/web-inspection-renderer.ts";

import "./style.css";

const CPU_FREQUENCY = Frequency.fromInteger(500n);
const TRACE_HISTORY_CAPACITY = 32;

interface WebMachineSession {
  readonly romName: string;
  readonly program: MemoryImage;

  readonly context: ExecutionContext;
  readonly initializer: MachineInitializer;

  readonly cpu: Cpu;
  readonly runtime: Chip8Runtime;

  readonly traceHistory: InstructionTraceBuffer;
  readonly snapshotInspection: () => WebInspectionViewModel;

  readonly displayBuffer: DisplayBuffer;
  readonly soundTimer: Timer;

  readonly browserKeyboard: BrowserKeyboard;
  readonly virtualKeypad: VirtualKeypad;
}

const romInput = requireElement<HTMLInputElement>("#rom-input");
const canvas = requireElement<HTMLCanvasElement>("#chip8-display");
const status = requireElement<HTMLElement>("#status");

const startButton = requireElement<HTMLButtonElement>("#start-button");
const pauseButton = requireElement<HTMLButtonElement>("#pause-button");
const stepButton = requireElement<HTMLButtonElement>("#step-button");
const resetButton = requireElement<HTMLButtonElement>("#reset-button");

const virtualKeypadElement = requireElement<HTMLElement>("#virtual-keypad");

const display = new CanvasDisplay(canvas);

const inspectionElement = requireElement<HTMLElement>(".inspection");
const inspection = new WebInspectionRenderer(inspectionElement);

const beeper = new WebAudioBeeper();

let machine: WebMachineSession | undefined;

let animationFrameId: number | undefined;

updateControls();
inspection.render(undefined);

romInput.addEventListener("change", () => {
  const rom = romInput.files?.[0];

  if (rom === undefined) {
    return;
  }

  unlockAudio();

  void loadAndRun(rom);
});

startButton.addEventListener("click", () => {
  unlockAudio();

  startMachine();
});

pauseButton.addEventListener("click", () => {
  pauseMachine();
});

stepButton.addEventListener("click", () => {
  stepMachine();
});

resetButton.addEventListener("click", () => {
  resetMachine();
});

document.addEventListener("visibilitychange", () => {
  if (document.hidden) {
    beeper.setActive(false);
  }
});

async function loadAndRun(rom: File): Promise<void> {
  stopHostLoop();

  beeper.setActive(false);

  machine?.runtime.pause();
  machine?.browserKeyboard.stop();
  machine?.virtualKeypad.stop();

  machine = undefined;

  updateControls();

  inspection.render(undefined);

  setStatus(`Loading ${rom.name}...`);

  try {
    const program = new MemoryImage(new Uint8Array(await rom.arrayBuffer()));

    machine = createMachine(rom.name, program);

    machine.browserKeyboard.start();
    machine.virtualKeypad.start();

    machine.runtime.resume();

    renderMachine(machine);

    updateControls();

    setStatus(`Running ${rom.name}`);

    runHostLoop(machine);
  } catch (error) {
    machine = undefined;

    updateControls();

    setStatus(`Unable to run ROM: ${describeError(error)}`, true);

    console.error(error);
  }
}

/**
 * Manually composes one Classic CHIP-8 machine for the web host.
 *
 * This remains intentionally explicit while the web application acts as a
 * second case study for Chip8NX composition ergonomics.
 */
function createMachine(romName: string, program: MemoryImage): WebMachineSession {
  const profile = CLASSIC_CHIP8_PROFILE;

  const delayTimer = new Timer();
  const soundTimer = new Timer();

  const verticalBlank = new VerticalBlank();

  const displayBuffer = new DisplayBuffer(profile.display.width, profile.display.height);

  const keyboard = new KeyboardState();

  const keyboardInput = new KeyboardInputHub(keyboard);

  const browserKeyboard = new BrowserKeyboard(keyboardInput.createSource());

  const virtualKeypad = new VirtualKeypad(virtualKeypadElement, keyboardInput.createSource());

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

  const traceHistory = new InstructionTraceBuffer(TRACE_HISTORY_CAPACITY);

  const instructionFormatter = new ClassicInstructionFormatter();

  const disassembler = new Disassembler(new Decoder(), instructionFormatter);

  const traceFormatter = new ClassicInstructionTraceFormatter(instructionFormatter);

  const cpu = new Cpu(context, new Decoder(), new InstructionExecutor(), traceHistory);

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

  const snapshotInspection = (): WebInspectionViewModel => {
    const cpuState = cpu.snapshot();

    let currentInstruction: CurrentInstructionInspection;

    try {
      currentInstruction = {
        outcome: "success",
        instruction: disassembler.disassembleAt(context.memory, cpuState.programCounter),
      };
    } catch (error) {
      currentInstruction = {
        outcome: "failure",
        address: cpuState.programCounter,
        error,
      };
    }

    return createWebInspectionViewModel(
      cpuState,
      currentInstruction,
      traceHistory.snapshot(),
      traceFormatter,
    );
  };

  return {
    romName,
    program,

    context,
    initializer,

    cpu,
    runtime,

    traceHistory,
    snapshotInspection,

    displayBuffer,
    browserKeyboard,
    virtualKeypad,
    soundTimer,
  };
}

function startMachine(): void {
  if (machine === undefined || !machine.runtime.isPaused) {
    return;
  }

  machine.runtime.resume();

  setStatus(`Running ${machine.romName}`);

  updateControls();

  runHostLoop(machine);
}

function pauseMachine(): void {
  if (machine === undefined || machine.runtime.isPaused) {
    return;
  }

  machine.runtime.pause();

  stopHostLoop();

  beeper.setActive(false);

  renderMachine(machine);

  setStatus(`Paused ${machine.romName}`);

  updateControls();
}

function stepMachine(): void {
  if (machine === undefined || !machine.runtime.isPaused) {
    return;
  }

  try {
    machine.runtime.step();

    renderMachine(machine);

    setStatus(`Paused ${machine.romName} — stepped one instruction.`);
  } catch (error) {
    setStatus(`Unable to step: ${describeError(error)}`, true);

    console.error(error);
  }
}

function resetMachine(): void {
  if (machine === undefined) {
    return;
  }

  machine.runtime.pause();

  stopHostLoop();

  beeper.setActive(false);

  try {
    machine.initializer.initialize(machine.context, CLASSIC_CHIP8_PROFILE, machine.program);

    machine.traceHistory.clear();

    renderMachine(machine);

    setStatus(`Reset ${machine.romName} — paused at program start.`);

    updateControls();
  } catch (error) {
    setStatus(`Unable to reset ROM: ${describeError(error)}`, true);

    console.error(error);
  }
}

function runHostLoop(session: WebMachineSession): void {
  if (animationFrameId !== undefined) {
    return;
  }

  const frame = (): void => {
    /*
     * Ignore a stale frame belonging to a ROM that has since been replaced.
     */
    if (machine !== session || session.runtime.isPaused) {
      animationFrameId = undefined;

      return;
    }

    try {
      /*
       * requestAnimationFrame controls only how often the browser host
       * observes the emulator.
       *
       * Chip8Runtime and its scheduler continue to own emulated CPU, timer,
       * and display-refresh timing.
       */
      session.runtime.tick();

      beeper.setActive(session.soundTimer.getValue() > 0);

      renderMachine(session);

      animationFrameId = requestAnimationFrame(frame);
    } catch (error) {
      animationFrameId = undefined;

      session.runtime.pause();

      session.browserKeyboard.stop();
      session.virtualKeypad.stop();

      beeper.setActive(false);

      renderMachine(session);

      setStatus(`Emulation stopped: ${describeError(error)}`, true);

      updateControls();

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

function updateControls(): void {
  if (machine === undefined) {
    startButton.disabled = true;
    pauseButton.disabled = true;
    stepButton.disabled = true;
    resetButton.disabled = true;

    return;
  }

  const paused = machine.runtime.isPaused;

  startButton.disabled = !paused;
  pauseButton.disabled = paused;
  stepButton.disabled = !paused;
  resetButton.disabled = false;
}

function renderMachine(session: WebMachineSession): void {
  display.render(session.displayBuffer);
  inspection.render(session.snapshotInspection());
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

function requireElement<T extends Element>(selector: string): T {
  const element = document.querySelector<T>(selector);

  if (element === null) {
    throw new Error(`Required element not found: ${selector}`);
  }

  return element;
}

function unlockAudio(): void {
  beeper.unlock().catch((error: unknown) => {
    /*
     * Audio failure should not prevent the emulator itself from running.
     */
    console.warn("Web Audio is unavailable:", error);
  });
}
