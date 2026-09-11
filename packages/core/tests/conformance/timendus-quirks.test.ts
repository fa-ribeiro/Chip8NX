import { assertEquals } from "@std/assert";

import { TestClock } from "../../src/clock/test-clock.ts";
import { address } from "../../src/core/types/address.ts";
import { byte } from "../../src/core/types/byte.ts";
import { type Duration, duration } from "../../src/core/types/duration.ts";
import { Frequency } from "../../src/core/types/frequency.ts";
import { Cpu } from "../../src/cpu/cpu.ts";
import type { ExecutionContext } from "../../src/cpu/execution-context.ts";
import { IndexRegister } from "../../src/cpu/index-register/index-register.ts";
import { InstructionExecutor } from "../../src/cpu/instruction-executor.ts";
import { ProgramCounter } from "../../src/cpu/program-counter/program-counter.ts";
import { Registers } from "../../src/cpu/registers/registers.ts";
import { Stack } from "../../src/cpu/stack/stack.ts";
import { DisplayBuffer } from "../../src/display/display-buffer.ts";
import { VerticalBlank } from "../../src/display/vertical-blank.ts";
import { ClassicFont } from "../../src/font/classic-font.ts";
import { Decoder } from "../../src/instruction/decoder.ts";
import { KeyboardState } from "../../src/keyboard/keyboard-state.ts";
import { CLASSIC_CHIP8_PROFILE } from "../../src/machine/classic/classic-chip8-profile.ts";
import { MachineInitializer } from "../../src/machine/machine-initializer.ts";
import { MemoryImageLoader } from "../../src/memory/memory-image-loader.ts";
import { MemoryImage } from "../../src/memory/memory-image.ts";
import { Ram } from "../../src/memory/ram.ts";
import { TestRandomNumberGenerator } from "../../src/random/test-random-number-generator.ts";
import { Chip8Runtime } from "../../src/runtime/chip8-runtime.ts";
import { Scheduler } from "../../src/scheduler/scheduler.ts";
import { Timer } from "../../src/timer/timer.ts";

/**
 * Timendus recommends enough CPU cycles per 60 Hz frame for the display-wait
 * test to distinguish real v-blank synchronization from a slow interpreter.
 *
 * 2 kHz gives roughly 33 CPU cycles per timer frame while remaining entirely
 * deterministic under TestClock.
 */
const TIMENDUS_QUIRKS_CPU_FREQUENCY = Frequency.fromInteger(2_000n);

/**
 * The CHIP-8 quirks test uses the delay timer for approximately three seconds
 * before rendering its final result screen. Five seconds gives the ROM ample
 * deterministic time to finish even when Classic v-blank waiting is enabled.
 */
const TIMENDUS_QUIRKS_EXECUTION_TIME = duration(5_000_000_000n as Duration);

/**
 * The Timendus quirks ROM supports automated platform selection through the
 * byte immediately before the normal CHIP-8 program start address.
 */
const TIMENDUS_PLATFORM_SELECTION_ADDRESS = address(0x1ff);
const TIMENDUS_PLATFORM_CHIP8 = byte(1);

/**
 * Timendus' three-row success glyph, cropped to its three significant columns.
 */
const EXPECTED_QUIRK_OK = ["#.#", "##.", "#.."].join("\n");

const EXPECTED_CLASSIC_QUIRK_RESULTS = [
  { name: "VF reset", x: 59, y: 2 },
  { name: "Memory", x: 59, y: 7 },
  { name: "Display wait", x: 59, y: 12 },
  { name: "Clipping", x: 59, y: 17 },
  { name: "Shifting", x: 59, y: 22 },
  { name: "Jumping", x: 59, y: 27 },
] as const;

Deno.test("Classic CHIP-8 passes the Timendus Quirks test ROM", async () => {
  const profile = CLASSIC_CHIP8_PROFILE;

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
    displayBuffer: new DisplayBuffer(profile.display.width, profile.display.height, "clip"),
    verticalBlank,
    keyboard: new KeyboardState(),
    font: new ClassicFont(profile.fontBaseAddress),
    randomNumberGenerator: new TestRandomNumberGenerator([byte(0)]),
  };

  const initializer = new MachineInitializer(new MemoryImageLoader());

  initializer.initialize(context, profile, program);

  // Timendus documents address 0x1FF as the automation hook for choosing the
  // target platform. The initializer must run first because it clears memory.
  context.memory.write(TIMENDUS_PLATFORM_SELECTION_ADDRESS, TIMENDUS_PLATFORM_CHIP8);

  const cpu = new Cpu(context, new Decoder(), new InstructionExecutor(profile.compatibility));

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

  const failures = EXPECTED_CLASSIC_QUIRK_RESULTS.filter(
    (result) =>
      snapshotRegion(context.displayBuffer, result.x, result.y, 3, 3) !== EXPECTED_QUIRK_OK,
  ).map((result) => result.name);

  assertEquals(failures, []);
});

function snapshotRegion(
  displayBuffer: DisplayBuffer,
  startX: number,
  startY: number,
  width: number,
  height: number,
): string {
  const rows: string[] = [];

  for (let y = startY; y < startY + height; y++) {
    let row = "";

    for (let x = startX; x < startX + width; x++) {
      row += displayBuffer.getPixel(x, y) ? "#" : ".";
    }

    rows.push(row);
  }

  return rows.join("\n");
}
