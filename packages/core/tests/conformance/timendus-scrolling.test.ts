import { assertEquals } from "@std/assert";

import {
  address,
  Byte,
  byte,
  Chip8Profile,
  Chip8Runtime,
  Cpu,
  Decoder,
  DisplayBuffer,
  type Duration,
  duration,
  type ExecutionContext,
  ExitState,
  Frequency,
  IndexRegister,
  InstructionExecutor,
  KeyboardState,
  MachineInitializer,
  MemoryImage,
  MemoryImageLoader,
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
} from "../../mod.ts";

import { TestClock } from "../../src/clock/test-clock.ts";
import { TestRandomNumberGenerator } from "../../src/random/test-random-number-generator.ts";

/**
 * The scrolling test contains many low-resolution sprite draws. Historical
 * SUPER-CHIP waits for vertical blank in low-resolution mode, so the test must
 * run long enough for those draws to complete.
 */
const TIMENDUS_SCROLLING_EXECUTION_TIME = duration(3_000_000_000n as Duration);

const TIMENDUS_SCROLLING_CPU_FREQUENCY = Frequency.fromInteger(2_000n);

const TIMENDUS_PLATFORM_SELECTION_ADDRESS = address(0x1ff);

/**
 * Timendus automation selection:
 *
 * 1 = SUPER-CHIP low-resolution mode with modern scrolling behavior.
 */
const TIMENDUS_SUPERCHIP_MODERN_LORES = byte(1);

/**
 * Timendus automation selection:
 *
 * 2 = SUPER-CHIP low-resolution mode with legacy scrolling behavior.
 */
const TIMENDUS_SUPERCHIP_LEGACY_LORES = byte(2);

/**
 * Timendus automation selection:
 *
 * 3 = SUPER-CHIP high-resolution mode.
 */
const TIMENDUS_SUPERCHIP_HIRES = byte(3);

const EXPECTED_ARROW_LEFT = [
  "########",
  "###..###",
  "##..####",
  "#......#",
  "#......#",
  "##..####",
  "###..###",
  "########",
].join("\n");

const EXPECTED_ARROW_RIGHT = [
  "########",
  "###..###",
  "####..##",
  "#......#",
  "#......#",
  "####..##",
  "###..###",
  "########",
].join("\n");

const EXPECTED_ARROW_DOWN = [
  "########",
  "###..###",
  "###..###",
  "#.#..#.#",
  "#......#",
  "##....##",
  "###..###",
  "########",
].join("\n");

Deno.test(
  "SUPER-CHIP 1.1 passes the Timendus Scrolling test in legacy low-resolution mode",
  async () => {
    const displayBuffer = await runTimendusScrolling(
      SUPERCHIP_PROFILE,
      TIMENDUS_SUPERCHIP_LEGACY_LORES,
    );

    assertEquals(displayBuffer.mode, "low");

    /*
     * Timendus draws the three arrows, applies the scrolling instructions,
     * and then draws boxes around their expected final positions.
     *
     * In historical SUPER-CHIP low-resolution mode, scrolling operates in
     * physical backing pixels. The automation path deliberately compensates
     * for that by issuing twice as many horizontal scrolls and scrolling down
     * by 12 physical rows.
     */
    assertEquals(snapshotLogicalRegion(displayBuffer, 34, 17, 8, 8), EXPECTED_ARROW_LEFT);

    assertEquals(snapshotLogicalRegion(displayBuffer, 22, 17, 8, 8), EXPECTED_ARROW_RIGHT);

    assertEquals(snapshotLogicalRegion(displayBuffer, 28, 6, 8, 8), EXPECTED_ARROW_DOWN);
  },
);

Deno.test(
  "Modern SUPER-CHIP passes the Timendus Scrolling test in modern low-resolution mode",
  async () => {
    const displayBuffer = await runTimendusScrolling(
      SUPERCHIP_MODERN_PROFILE,
      TIMENDUS_SUPERCHIP_MODERN_LORES,
    );

    assertEquals(displayBuffer.mode, "low");

    assertEquals(snapshotLogicalRegion(displayBuffer, 34, 17, 8, 8), EXPECTED_ARROW_LEFT);

    assertEquals(snapshotLogicalRegion(displayBuffer, 22, 17, 8, 8), EXPECTED_ARROW_RIGHT);

    assertEquals(snapshotLogicalRegion(displayBuffer, 28, 6, 8, 8), EXPECTED_ARROW_DOWN);
  },
);

Deno.test(
  "SUPER-CHIP 1.1 passes the Timendus Scrolling test in high-resolution mode",
  async () => {
    const displayBuffer = await runTimendusScrolling(
      SUPERCHIP_PROFILE,
      TIMENDUS_SUPERCHIP_HIRES,
    );

    assertEquals(displayBuffer.mode, "high");

    assertEquals(snapshotLogicalRegion(displayBuffer, 66, 34, 8, 8), EXPECTED_ARROW_LEFT);

    assertEquals(snapshotLogicalRegion(displayBuffer, 54, 34, 8, 8), EXPECTED_ARROW_RIGHT);

    assertEquals(snapshotLogicalRegion(displayBuffer, 60, 23, 8, 8), EXPECTED_ARROW_DOWN);
  },
);

async function runTimendusScrolling(
  profile: Chip8Profile,
  platformSelection: Byte,
): Promise<DisplayBuffer> {
  const romBytes = await Deno.readFile(new URL("./roms/8-scrolling.ch8", import.meta.url));

  const program = new MemoryImage(romBytes);

  const delayTimer = new Timer();
  const soundTimer = new Timer();
  const verticalBlank = new VerticalBlank();

  const largeFont = profile.fonts.large;

  if (largeFont === null) {
    throw new Error("SUPER-CHIP profile must provide a large font.");
  }

  const context: ExecutionContext = {
    registers: new Registers(),
    memory: new Ram(profile.memorySize),
    stack: new Stack(profile.stackCapacity),
    programCounter: new ProgramCounter(profile.programStartAddress),
    indexRegister: new IndexRegister(),
    delayTimer,
    soundTimer,
    displayBuffer: new DisplayBuffer(
      profile.display.specification,
      profile.quirks.spriteOverflow,
    ),
    verticalBlank,
    keyboard: new KeyboardState(),
    font: new SuperChipFont(profile.fonts.small.baseAddress, largeFont.baseAddress),
    randomNumberGenerator: new TestRandomNumberGenerator([byte(0)]),
    rplFlags: new RplFlags(),
    exitState: new ExitState(),
  };

  const initializer = new MachineInitializer(new MemoryImageLoader());

  initializer.initialize(context, profile, program);

  /*
   * Timendus reads 0x1FF before displaying its menu. Initialization must
   * happen first because MachineInitializer clears machine memory.
   */
  context.memory.write(TIMENDUS_PLATFORM_SELECTION_ADDRESS, platformSelection);

  const cpu = new Cpu(
    context,
    new Decoder(),
    new InstructionExecutor(profile.instructionSet, profile.quirks),
  );

  const clock = new TestClock();

  const runtime = new Chip8Runtime(
    cpu,
    delayTimer,
    soundTimer,
    verticalBlank,
    new Scheduler(clock),
    {
      cpuFrequency: TIMENDUS_SCROLLING_CPU_FREQUENCY,
    },
    profile.timerFrequency,
    profile.display.refreshFrequency,
  );

  runtime.resume();

  clock.advance(TIMENDUS_SCROLLING_EXECUTION_TIME);

  runtime.tick();

  return context.displayBuffer;
}

function snapshotLogicalRegion(
  displayBuffer: DisplayBuffer,
  startX: number,
  startY: number,
  width: number,
  height: number,
): string {
  const scale = displayBuffer.mode === "low" ? 2 : 1;

  const rows: string[] = [];

  for (let y = startY; y < startY + height; y++) {
    let row = "";

    for (let x = startX; x < startX + width; x++) {
      row += displayBuffer.getPixel(x * scale, y * scale) ? "#" : ".";
    }

    rows.push(row);
  }

  return rows.join("\n");
}
