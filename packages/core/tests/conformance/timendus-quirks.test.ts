import { assertEquals } from "@std/assert";

import {
  address,
  type Byte,
  byte,
  type Chip8Profile,
  Chip8Runtime,
  CLASSIC_CHIP8_PROFILE,
  ClassicFont,
  Cpu,
  Decoder,
  DisplayBuffer,
  type Duration,
  duration,
  ExecutionContext,
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
  SUPERCHIP_PROFILE,
  SuperChipFont,
  Timer,
  VerticalBlank,
} from "../../mod.ts";

import { TestClock } from "../../src/clock/test-clock.ts";
import { TestRandomNumberGenerator } from "../../src/random/test-random-number-generator.ts";

/**
 * Timendus recommends enough CPU cycles per refresh interval for the display-wait
 * test to distinguish real v-blank synchronization from a slow interpreter.
 *
 * 2 kHz gives roughly 31-33 CPU cycles per refresh interval for the Classic
 * CHIP-8 and SUPER-CHIP profiles while remaining entirely deterministic under
 * TestClock.
 */
const TIMENDUS_QUIRKS_CPU_FREQUENCY = Frequency.fromInteger(2_000n);

/**
 * The CHIP-8 quirks test uses the delay timer for approximately three seconds
 * before rendering its final result screen. Five seconds gives the ROM ample
 * deterministic time to finish even when low-resolution v-blank waiting is
 * enabled.
 */
const TIMENDUS_QUIRKS_EXECUTION_TIME = duration(5_000_000_000n as Duration);

/**
 * The Timendus quirks ROM supports automated platform selection through the
 * byte immediately before the normal CHIP-8 program start address.
 */
const TIMENDUS_PLATFORM_SELECTION_ADDRESS = address(0x1ff);

const TIMENDUS_PLATFORM_CHIP8 = byte(1);
const TIMENDUS_PLATFORM_SUPERCHIP_LEGACY = byte(4);

/**
 * Timendus' three-row success glyph, cropped to its three significant columns.
 */
const EXPECTED_QUIRK_OK = ["#.#", "##.", "#.."].join("\n");

const QUIRK_RESULT_REGIONS = [
  { name: "VF reset", x: 59, y: 2 },
  { name: "Memory", x: 59, y: 7 },
  { name: "Display wait", x: 59, y: 12 },
  { name: "Clipping", x: 59, y: 17 },
  { name: "Shifting", x: 59, y: 22 },
  { name: "Jumping", x: 59, y: 27 },
] as const;

Deno.test("Classic CHIP-8 passes the Timendus Quirks test ROM", async () => {
  const displayBuffer = await runTimendusQuirks(CLASSIC_CHIP8_PROFILE, TIMENDUS_PLATFORM_CHIP8);

  assertQuirksPassed(displayBuffer);
});

Deno.test("SUPER-CHIP 1.1 passes the Timendus Quirks test ROM in legacy mode", async () => {
  const displayBuffer = await runTimendusQuirks(
    SUPERCHIP_PROFILE,
    TIMENDUS_PLATFORM_SUPERCHIP_LEGACY,
  );

  assertEquals(displayBuffer.mode, "low");

  assertQuirksPassed(displayBuffer);
});

async function runTimendusQuirks(
  profile: Chip8Profile,
  platformSelection: Byte,
): Promise<DisplayBuffer> {
  const romBytes = await Deno.readFile(new URL("./roms/5-quirks.ch8", import.meta.url));

  const program = new MemoryImage(romBytes);

  const delayTimer = new Timer();
  const soundTimer = new Timer();
  const verticalBlank = new VerticalBlank();

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
    font: profile.fonts.large === null
      ? new ClassicFont(profile.fonts.small.baseAddress)
      : new SuperChipFont(profile.fonts.small.baseAddress, profile.fonts.large.baseAddress),
    randomNumberGenerator: new TestRandomNumberGenerator([byte(0)]),
    rplFlags: new RplFlags(),
    exitState: new ExitState(),
  };

  const initializer = new MachineInitializer(new MemoryImageLoader());

  initializer.initialize(context, profile, program);

  /*
   * Timendus documents address 0x1FF as the automation hook for choosing the
   * target platform. The initializer must run first because it clears memory.
   */
  context.memory.write(TIMENDUS_PLATFORM_SELECTION_ADDRESS, platformSelection);

  const cpu = new Cpu(
    context,
    new Decoder(),
    new InstructionExecutor(profile.instructionSet, profile.quirks),
  );

  const clock = new TestClock();
  const scheduler = new Scheduler(clock);

  const runtime = new Chip8Runtime(
    cpu,
    delayTimer,
    soundTimer,
    verticalBlank,
    scheduler,
    {
      cpuFrequency: TIMENDUS_QUIRKS_CPU_FREQUENCY,
    },
    profile.timerFrequency,
    profile.display.refreshFrequency,
  );

  runtime.resume();

  clock.advance(TIMENDUS_QUIRKS_EXECUTION_TIME);

  runtime.tick();

  return context.displayBuffer;
}

function assertQuirksPassed(displayBuffer: DisplayBuffer): void {
  const failures = QUIRK_RESULT_REGIONS.filter(
    (result) =>
      snapshotLogicalRegion(displayBuffer, result.x, result.y, 3, 3) !== EXPECTED_QUIRK_OK,
  ).map((result) => result.name);

  assertEquals(failures, []);
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
