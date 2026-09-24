import {
  type Address,
  address,
  CHIP48_PROFILE,
  Chip8Profile,
  Chip8Runtime,
  CLASSIC_CHIP8_PROFILE,
  ClassicFont,
  Cpu,
  Decoder,
  DefaultRandomNumberGenerator,
  DisplayBuffer,
  type ExecutionContext,
  ExitState,
  Frequency,
  IndexRegister,
  INSTRUCTION_SIZE,
  InstructionExecutor,
  KeyboardState,
  MachineInitializer,
  type Memory,
  MemoryImage,
  MemoryImageLoader,
  PerformanceClock,
  ProgramCounter,
  Ram,
  Registers,
  RplFlags,
  Scheduler,
  Stack,
  SUPERCHIP_MODERN_PROFILE,
  SUPERCHIP_PROFILE,
  SuperChipFont,
  Timer,
  VerticalBlank,
} from "@chip8nx/core";
import {
  Chip48InstructionFormatter,
  ClassicInstructionFormatter,
  ClassicInstructionTraceFormatter,
  Disassembler,
  InstructionFormatter,
  InstructionTraceBuffer,
} from "@chip8nx/inspection";
import { WebAudioBeeper } from "./audio/web-audio-beeper.ts";
import { AddressBreakpoints } from "./debugger/address-breakpoints.ts";
import { WebBreakpointPanel } from "./debugger/web-breakpoint-panel.ts";
import { CanvasDisplay, type CanvasDisplayPalette } from "./display/canvas-display.ts";
import {
  createWebInspectionViewModel,
  type NearbyInstructionInspection,
  type WebInspectionViewModel,
} from "./inspection/web-inspection-view-model.ts";
import { WebInspectionRenderer } from "./inspection/web-inspection-renderer.ts";
import { WebMemoryPanel } from "./inspection/web-memory-panel.ts";
import { BrowserKeyboard } from "./keyboard/browser-keyboard.ts";
import { KeyboardInputHub } from "./keyboard/keyboard-input-hub.ts";
import { VirtualKeypad } from "./keyboard/virtual-keypad.ts";
import { WebMachineLifecycle } from "./machine/web-machine-lifecycle.ts";
import { WebRomLoader } from "./rom/web-rom-loader.ts";
import {
  loadWebTheme,
  parseWebTheme,
  storeWebTheme,
  type WebTheme,
} from "./theme/web-theme.ts";
import { createWebFaviconDataUrl } from "./theme/web-favicon.ts";
import "./style.css";

const CPU_FREQUENCY = Frequency.fromInteger(500n);
const TRACE_HISTORY_CAPACITY = 32;

const DISASSEMBLY_INSTRUCTIONS_BEFORE = 3;
const DISASSEMBLY_INSTRUCTIONS_AFTER = 6;

interface WebMachineSession {
  readonly romName: string;
  readonly program: MemoryImage;
  readonly profile: Chip8Profile;

  readonly lifecycle: WebMachineLifecycle;
  readonly snapshotInspection: () => WebInspectionViewModel;

  readonly memory: Memory;
  readonly displayBuffer: DisplayBuffer;
  readonly soundTimer: Timer;
}

const romInput = requireElement<HTMLInputElement>("#rom-input");
const romLoadButton = requireElement<HTMLButtonElement>("#rom-load-button");
const romFileName = requireElement<HTMLElement>("#rom-file-name");
const romFileSize = requireElement<HTMLElement>("#rom-file-size");

const canvas = requireElement<HTMLCanvasElement>("#chip8-display");
const displayResolution = requireElement<HTMLElement>("#display-resolution");
const status = requireElement<HTMLElement>("#status");
const statusProfile = requireElement<HTMLElement>("#status-profile");
const statusCpuFrequency = requireElement<HTMLElement>("#status-cpu-frequency");
const statusTimerFrequency = requireElement<HTMLElement>("#status-timer-frequency");
const statusRefreshFrequency = requireElement<HTMLElement>("#status-refresh-frequency");
const statusDisplay = requireElement<HTMLElement>("#status-display");

const runToggleButton = requireElement<HTMLButtonElement>("#run-toggle-button");
const runToggleLabel = requireElement<HTMLElement>("#run-toggle-label");

const stepButton = requireElement<HTMLButtonElement>("#step-button");
const resetButton = requireElement<HTMLButtonElement>("#reset-button");

const machineState = requireElement<HTMLElement>("#machine-state");
const machineStateLabel = requireElement<HTMLElement>("#machine-state-label");

const cpuStateIndicator = requireElement<HTMLElement>("#cpu-state-indicator");
const cpuStateIndicatorLabel = requireElement<HTMLElement>("#cpu-state-indicator-label");

const profileSelect = requireElement<HTMLSelectElement>("#profile-select");
const themeSelect = requireElement<HTMLSelectElement>("#theme-select");

const virtualKeypadElement = requireElement<HTMLElement>("#virtual-keypad");

const initialTheme = loadWebTheme(globalThis.localStorage);

document.documentElement.dataset.theme = initialTheme;
themeSelect.value = initialTheme;

updateWebFavicon();

const display = new CanvasDisplay(canvas, readCanvasDisplayPalette());

const inspectionElement = requireElement<HTMLElement>(".inspection");
const breakpointPanelElement = requireElement<HTMLElement>("#breakpoint-panel");
const memoryPanelElement = requireElement<HTMLElement>("#memory-panel");

const beeper = new WebAudioBeeper();

const rplFlags = new RplFlags();
const breakpoints = new AddressBreakpoints();
const romLoader = new WebRomLoader();

let machine: WebMachineSession | undefined;

const breakpointPanel = new WebBreakpointPanel(breakpointPanelElement, breakpoints, () => {
  if (machine !== undefined) {
    renderMachine(machine);
  }
});

const inspection = new WebInspectionRenderer(inspectionElement, {
  onBreakpointToggle: (targetAddress) => {
    if (breakpoints.get(targetAddress) === undefined) {
      breakpoints.add(targetAddress);
    } else {
      breakpoints.remove(targetAddress);
    }

    breakpointPanel.render();

    if (machine !== undefined) {
      renderMachine(machine);
    }
  },
});

const memoryPanel = new WebMemoryPanel(memoryPanelElement);

let animationFrameId: number | undefined;

updateControls();
updateStatusDetails();
inspection.render(undefined);
breakpointPanel.setMemorySize(undefined);
memoryPanel.setMemory(undefined);

romLoadButton.addEventListener("click", () => {
  /*
   * Clear the native input first so choosing the same file again still
   * produces a change event and can be used as an explicit ROM reload.
   */
  romInput.value = "";

  romInput.click();
});

romInput.addEventListener("change", () => {
  const rom = romInput.files?.[0];

  if (rom === undefined) {
    return;
  }

  unlockAudio();

  void loadAndRun(rom);
});

runToggleButton.addEventListener("click", () => {
  toggleMachineRunning();
});

stepButton.addEventListener("click", () => {
  stepMachine();
});

resetButton.addEventListener("click", () => {
  resetMachine();
});

profileSelect.addEventListener("change", () => {
  recomposeMachineForSelectedProfile();

  if (machine === undefined) {
    updateStatusDetails();
  }
});

themeSelect.addEventListener("change", () => {
  const theme = parseWebTheme(themeSelect.value);

  if (theme === undefined) {
    themeSelect.value = document.documentElement.dataset.theme ?? initialTheme;

    return;
  }

  applyWebTheme(theme);

  storeWebTheme(globalThis.localStorage, theme);
});

document.addEventListener("visibilitychange", () => {
  if (document.hidden) {
    beeper.setActive(false);
  }
});

async function loadAndRun(rom: File): Promise<void> {
  stopHostLoop();

  beeper.setActive(false);
  machine?.lifecycle.deactivate();

  machine = undefined;
  breakpoints.clear();
  breakpointPanel.setMemorySize(undefined);
  memoryPanel.setMemory(undefined);

  updateControls();

  inspection.render(undefined);
  romFileName.textContent = "No ROM loaded";
  romFileSize.textContent = "— bytes";

  setStatus(`Loading ${rom.name}...`);

  try {
    const program = await romLoader.load(rom);

    if (program === undefined) {
      return;
    }

    machine = createMachine(rom.name, program, readSelectedProfile());
    breakpointPanel.setMemorySize(machine.profile.memorySize);
    memoryPanel.setMemory(machine.memory, machine.profile.programStartAddress);

    machine.lifecycle.activate();
    machine.lifecycle.start();

    renderMachine(machine);

    updateControls();
    setStatus(`Running ${rom.name}`);

    runHostLoop(machine);

    romFileName.textContent = rom.name;
    romFileSize.textContent = `${rom.size} bytes`;
  } catch (error) {
    machine?.lifecycle.deactivate();
    machine = undefined;
    breakpointPanel.setMemorySize(undefined);
    memoryPanel.setMemory(undefined);

    updateControls();

    setStatus(`Unable to run ROM: ${describeError(error)}`, true);

    console.error(error);
  }
}

/**
 * Manually composes one CHIP-8 machine for the web host using the supplied
 * machine profile.
 *
 * This remains intentionally explicit while the web application acts as a
 * second case study for Chip8NX composition ergonomics.
 */
function createMachine(
  romName: string,
  program: MemoryImage,
  profile: Chip8Profile,
): WebMachineSession {
  const delayTimer = new Timer();
  const soundTimer = new Timer();

  const verticalBlank = new VerticalBlank();
  const displayBuffer = new DisplayBuffer(
    profile.display.specification,
    profile.quirks.spriteOverflow,
  );

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

    font: profile.fonts.large === null
      ? new ClassicFont(profile.fonts.small.baseAddress)
      : new SuperChipFont(profile.fonts.small.baseAddress, profile.fonts.large.baseAddress),

    randomNumberGenerator: new DefaultRandomNumberGenerator(),

    rplFlags,

    exitState: new ExitState(),
  };

  const initializer = new MachineInitializer(new MemoryImageLoader());

  initializer.initialize(context, profile, program);

  const traceHistory = new InstructionTraceBuffer(TRACE_HISTORY_CAPACITY);

  const instructionFormatter = createInstructionFormatter(profile);

  const disassembler = new Disassembler(new Decoder(), instructionFormatter);

  const traceFormatter = new ClassicInstructionTraceFormatter(instructionFormatter);

  const cpu = new Cpu(
    context,
    new Decoder(),
    new InstructionExecutor(profile.instructionSet, profile.quirks),
    traceHistory,
  );

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
    () => breakpoints.shouldExecute(context.programCounter.getValue()),
  );

  const lifecycle = new WebMachineLifecycle(
    runtime,
    context.exitState,
    () => {
      initializer.initialize(context, profile, program);
      traceHistory.clear();
    },
    [browserKeyboard, virtualKeypad],
    breakpoints,
  );

  const snapshotInspection = (): WebInspectionViewModel => {
    const cpuState = cpu.snapshot();

    const nearbyInstructions = inspectNearbyInstructions(
      context.memory,
      cpuState.programCounter,
      disassembler,
      breakpoints,
    );

    return createWebInspectionViewModel(
      cpuState,
      profile.stackCapacity,
      nearbyInstructions,
      traceHistory.snapshot(),
      traceFormatter,
    );
  };

  return {
    romName,
    program,
    profile,

    lifecycle,
    snapshotInspection,

    memory: context.memory,
    displayBuffer,
    soundTimer,
  };
}

function toggleMachineRunning(): void {
  if (machine === undefined) {
    return;
  }

  switch (machine.lifecycle.state.kind) {
    case "paused":
      unlockAudio();
      startMachine();
      return;

    case "running":
      pauseMachine();
      return;

    case "inactive":
    case "exited":
    case "failed":
      return;
  }
}

function startMachine(): void {
  if (machine === undefined || machine.lifecycle.state.kind !== "paused") {
    return;
  }

  try {
    const lifecycleState = machine.lifecycle.start();

    if (lifecycleState.kind === "exited") {
      beeper.setActive(false);
      renderMachine(machine);
      setStatus(`Exited ${machine.romName} — interpreter requested exit.`);
      updateControls();

      return;
    }

    setStatus(`Running ${machine.romName}`);

    updateControls();

    runHostLoop(machine);
  } catch (error) {
    beeper.setActive(false);
    renderMachine(machine);
    setStatus(`Unable to start ROM: ${describeError(error)}`, true);
    updateControls();

    console.error(error);
  }
}

function pauseMachine(): void {
  if (machine === undefined || machine.lifecycle.state.kind !== "running") {
    return;
  }

  machine.lifecycle.pause();

  stopHostLoop();

  beeper.setActive(false);

  renderMachine(machine);

  setStatus(`Paused ${machine.romName}`);

  updateControls();
}

function stepMachine(): void {
  if (machine === undefined || machine.lifecycle.state.kind !== "paused") {
    return;
  }

  try {
    const lifecycleState = machine.lifecycle.step();

    beeper.setActive(false);
    renderMachine(machine);

    if (lifecycleState.kind === "exited") {
      setStatus(`Exited ${machine.romName} — interpreter requested exit.`);
    } else {
      setStatus(`Paused ${machine.romName} — stepped one instruction.`);
    }

    updateControls();
  } catch (error) {
    beeper.setActive(false);
    renderMachine(machine);

    setStatus(`Unable to step: ${describeError(error)}`, true);

    updateControls();

    console.error(error);
  }
}

function resetMachine(): void {
  if (machine === undefined) {
    return;
  }

  stopHostLoop();

  beeper.setActive(false);

  try {
    machine.lifecycle.reset();

    renderMachine(machine);

    setStatus(`Reset ${machine.romName} — paused at program start.`);

    updateControls();
  } catch (error) {
    renderMachine(machine);

    setStatus(`Unable to reset ROM: ${describeError(error)}`, true);

    updateControls();

    console.error(error);
  }
}

function runHostLoop(session: WebMachineSession): void {
  if (animationFrameId !== undefined) {
    return;
  }

  const frame = (): void => {
    /*
     * Ignore a stale frame belonging to a ROM that has since been replaced,
     * or a frame that was already queued when the session stopped running.
     */
    if (machine !== session || session.lifecycle.state.kind !== "running") {
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
      const lifecycleState = session.lifecycle.tick();

      if (lifecycleState.kind === "running") {
        beeper.setActive(session.soundTimer.getValue() > 0);
      } else {
        beeper.setActive(false);
      }

      renderMachine(session);

      if (lifecycleState.kind === "exited") {
        animationFrameId = undefined;

        setStatus(`Exited ${session.romName} — interpreter requested exit.`);
        updateControls();

        return;
      }

      if (lifecycleState.kind === "paused") {
        animationFrameId = undefined;

        if (lifecycleState.reason.kind === "breakpoint") {
          setStatus(
            `Paused ${session.romName} — breakpoint at ${
              formatAddress(
                lifecycleState.reason.address,
              )
            }.`,
          );
        } else {
          setStatus(`Paused ${session.romName}`);
        }

        updateControls();

        return;
      }

      animationFrameId = requestAnimationFrame(frame);
    } catch (error) {
      animationFrameId = undefined;

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
    runToggleButton.disabled = true;
    runToggleButton.dataset.action = "start";
    runToggleLabel.textContent = "Start";

    stepButton.disabled = true;
    resetButton.disabled = true;

    machineState.dataset.state = "empty";
    machineStateLabel.textContent = "No ROM";

    cpuStateIndicator.dataset.state = "empty";
    cpuStateIndicatorLabel.textContent = "Idle";

    return;
  }

  const lifecycleState = machine.lifecycle.state;

  switch (lifecycleState.kind) {
    case "inactive":
      runToggleButton.disabled = true;
      runToggleButton.dataset.action = "start";
      runToggleLabel.textContent = "Start";

      stepButton.disabled = true;
      resetButton.disabled = true;

      machineState.dataset.state = "inactive";
      machineStateLabel.textContent = "Inactive";

      cpuStateIndicator.dataset.state = "inactive";
      cpuStateIndicatorLabel.textContent = "Idle";
      return;

    case "paused": {
      const isBreakpoint = lifecycleState.reason.kind === "breakpoint";

      runToggleButton.disabled = false;
      runToggleButton.dataset.action = "start";
      runToggleLabel.textContent = isBreakpoint ? "Continue" : "Start";

      stepButton.disabled = false;
      resetButton.disabled = false;

      machineState.dataset.state = "paused";
      machineStateLabel.textContent = isBreakpoint ? "Breakpoint" : "Paused";

      cpuStateIndicator.dataset.state = "paused";
      cpuStateIndicatorLabel.textContent = isBreakpoint ? "Paused" : "Ready";
      return;
    }

    case "running":
      runToggleButton.disabled = false;
      runToggleButton.dataset.action = "pause";
      runToggleLabel.textContent = "Pause";

      stepButton.disabled = true;
      resetButton.disabled = false;

      machineState.dataset.state = "running";
      machineStateLabel.textContent = "Running";

      cpuStateIndicator.dataset.state = "running";
      cpuStateIndicatorLabel.textContent = "Live";
      return;

    case "exited":
      runToggleButton.disabled = true;
      runToggleButton.dataset.action = "start";
      runToggleLabel.textContent = "Start";

      stepButton.disabled = true;
      resetButton.disabled = false;

      machineState.dataset.state = "exited";
      machineStateLabel.textContent = "Exited";

      cpuStateIndicator.dataset.state = "exited";
      cpuStateIndicatorLabel.textContent = "Stopped";
      return;

    case "failed":
      runToggleButton.disabled = true;
      runToggleButton.dataset.action = "start";
      runToggleLabel.textContent = "Start";

      stepButton.disabled = true;
      resetButton.disabled = false;

      machineState.dataset.state = "failed";
      machineStateLabel.textContent = "Error";

      cpuStateIndicator.dataset.state = "failed";
      cpuStateIndicatorLabel.textContent = "Error";
      return;
  }
}

function updateWebFavicon(): void {
  const styles = getComputedStyle(document.documentElement);

  const favicon = document.getElementById("favicon") as HTMLLinkElement;

  favicon.href = createWebFaviconDataUrl({
    background: requireCssCustomProperty(styles, "--color-display-background"),

    foreground: requireCssCustomProperty(styles, "--color-display-foreground"),

    border: requireCssCustomProperty(styles, "--color-border-strong"),

    accent: requireCssCustomProperty(styles, "--color-accent"),
  });
}

function renderMachine(session: WebMachineSession): void {
  display.render(session.displayBuffer);
  displayResolution.textContent =
    `${session.displayBuffer.width} × ${session.displayBuffer.height}`;
  updateStatusDetails(session);

  const inspectionViewModel = session.snapshotInspection();

  inspection.render(inspectionViewModel);
  memoryPanel.setReferenceAddresses({
    programCounter: inspectionViewModel.cpu.programCounterAddress,
    indexRegister: inspectionViewModel.cpu.indexRegisterAddress,
  });
  memoryPanel.render();
}

function updateStatusDetails(session: WebMachineSession | undefined = machine): void {
  const profile = session?.profile ?? readSelectedProfile();

  statusProfile.textContent = describeProfile(profile);
  statusCpuFrequency.textContent = formatFrequency(CPU_FREQUENCY);
  statusTimerFrequency.textContent = formatFrequency(profile.timerFrequency);
  statusRefreshFrequency.textContent = formatFrequency(profile.display.refreshFrequency);
  statusDisplay.textContent = session === undefined
    ? describeInitialDisplay(profile)
    : describeDisplay(session.displayBuffer);
}

function describeProfile(profile: Chip8Profile): string {
  if (profile === CLASSIC_CHIP8_PROFILE) {
    return "Classic CHIP-8";
  }

  if (profile === CHIP48_PROFILE) {
    return "CHIP-48 2.25";
  }

  if (profile === SUPERCHIP_PROFILE) {
    return "SUPER-CHIP 1.1";
  }

  if (profile === SUPERCHIP_MODERN_PROFILE) {
    return "SUPER-CHIP Modern";
  }

  return "Custom";
}

function formatAddress(value: Address): string {
  return `0x${value.toString(16).padStart(3, "0").toUpperCase()}`;
}

function formatFrequency(frequency: Frequency): string {
  if (frequency.denominator === 1n) {
    return `${frequency.numerator} Hz`;
  }

  const value = Number(frequency.numerator) / Number(frequency.denominator);

  return `${value.toFixed(2)} Hz`;
}

function describeInitialDisplay(profile: Chip8Profile): string {
  const specification = profile.display.specification;

  if (specification.kind === "fixed") {
    return `${specification.width} × ${specification.height}`;
  }

  return `${specification.backingWidth / 2} × ${specification.backingHeight / 2} LOW`;
}

function describeDisplay(displayBuffer: DisplayBuffer): string {
  const resolution = `${displayBuffer.width} × ${displayBuffer.height}`;

  return displayBuffer.mode === null
    ? resolution
    : `${resolution} ${displayBuffer.mode.toUpperCase()}`;
}

function applyWebTheme(theme: WebTheme): void {
  document.documentElement.dataset.theme = theme;

  updateWebFavicon();

  display.setPalette(readCanvasDisplayPalette());

  /*
   * CSS updates the application chrome immediately.
   *
   * Canvas pixels are an independent bitmap, so redraw the current
   * framebuffer when a machine exists.
   */
  if (machine !== undefined) {
    display.render(machine.displayBuffer);
  }
}

function readCanvasDisplayPalette(): CanvasDisplayPalette {
  const styles = getComputedStyle(document.documentElement);

  return {
    background: requireCssCustomProperty(styles, "--color-display-background"),

    foreground: requireCssCustomProperty(styles, "--color-display-foreground"),
  };
}

function requireCssCustomProperty(styles: CSSStyleDeclaration, propertyName: string): string {
  const value = styles.getPropertyValue(propertyName).trim();

  if (value.length === 0) {
    throw new Error(`Required CSS custom property not found: ${propertyName}`);
  }

  return value;
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

function inspectNearbyInstructions(
  memory: Memory,
  programCounter: Address,
  disassembler: Disassembler,
  breakpoints: AddressBreakpoints,
): readonly NearbyInstructionInspection[] {
  const inspections: NearbyInstructionInspection[] = [];

  for (
    let relativeInstruction = -DISASSEMBLY_INSTRUCTIONS_BEFORE;
    relativeInstruction <= DISASSEMBLY_INSTRUCTIONS_AFTER;
    relativeInstruction++
  ) {
    const sourceValue = programCounter + relativeInstruction * INSTRUCTION_SIZE;

    /*
     * Only include addresses from which a complete CHIP-8 instruction
     * can be read.
     */
    if (sourceValue < 0 || sourceValue + INSTRUCTION_SIZE > memory.size) {
      continue;
    }

    const sourceAddress = address(sourceValue);

    try {
      inspections.push({
        address: sourceAddress,
        current: sourceAddress === programCounter,
        breakpoint: describeBreakpointAt(breakpoints, sourceAddress),
        result: {
          outcome: "success",
          instruction: disassembler.disassembleAt(memory, sourceAddress),
        },
      });
    } catch (error) {
      inspections.push({
        address: sourceAddress,
        current: sourceAddress === programCounter,
        breakpoint: describeBreakpointAt(breakpoints, sourceAddress),
        result: {
          outcome: "failure",
          error,
        },
      });
    }
  }

  return inspections;
}

function describeBreakpointAt(
  breakpoints: AddressBreakpoints,
  targetAddress: Address,
): NearbyInstructionInspection["breakpoint"] {
  const breakpoint = breakpoints.get(targetAddress);

  if (breakpoint === undefined) {
    return "none";
  }

  return breakpoint.enabled ? "enabled" : "disabled";
}

function readSelectedProfile(): Chip8Profile {
  switch (profileSelect.value) {
    case "classic":
      return CLASSIC_CHIP8_PROFILE;

    case "chip48":
      return CHIP48_PROFILE;

    case "superchip":
      return SUPERCHIP_PROFILE;

    case "superchip-modern":
      return SUPERCHIP_MODERN_PROFILE;

    default:
      throw new Error(`Unsupported CHIP-8 profile: ${profileSelect.value}`);
  }
}

function createInstructionFormatter(profile: Chip8Profile): InstructionFormatter {
  if (profile === CLASSIC_CHIP8_PROFILE) {
    return new ClassicInstructionFormatter();
  }

  if (
    profile === CHIP48_PROFILE ||
    profile === SUPERCHIP_PROFILE ||
    profile === SUPERCHIP_MODERN_PROFILE
  ) {
    return new Chip48InstructionFormatter();
  }

  throw new Error("No instruction formatter is available for this CHIP-8 profile.");
}

function recomposeMachineForSelectedProfile(): void {
  if (machine === undefined) {
    return;
  }

  const previousMachine = machine;
  const wasRunning = previousMachine.lifecycle.state.kind === "running";

  try {
    /*
     * Compose the replacement before disturbing the currently working
     * machine. If composition fails, the existing session remains intact.
     */
    const replacement = createMachine(
      previousMachine.romName,
      previousMachine.program,
      readSelectedProfile(),
    );

    stopHostLoop();

    previousMachine.lifecycle.deactivate();

    beeper.setActive(false);

    machine = replacement;
    breakpointPanel.setMemorySize(replacement.profile.memorySize);
    memoryPanel.setMemory(replacement.memory);

    replacement.lifecycle.activate();

    if (wasRunning) {
      replacement.lifecycle.start();
    }

    renderMachine(replacement);
    updateControls();

    setStatus(`${wasRunning ? "Running" : "Paused"} ${replacement.romName} — profile changed.`);

    if (wasRunning) {
      runHostLoop(replacement);
    }
  } catch (error) {
    /*
     * Restore the selector so it continues to describe the machine that
     * is actually active.
     */
    if (previousMachine.profile === CHIP48_PROFILE) {
      profileSelect.value = "chip48";
    } else if (previousMachine.profile === SUPERCHIP_PROFILE) {
      profileSelect.value = "superchip";
    } else if (previousMachine.profile === SUPERCHIP_MODERN_PROFILE) {
      profileSelect.value = "superchip-modern";
    } else {
      profileSelect.value = "classic";
    }

    setStatus(`Unable to change profile: ${describeError(error)}`, true);

    console.error(error);
  }
}
