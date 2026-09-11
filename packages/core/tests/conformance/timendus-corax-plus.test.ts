import { assertEquals } from "@std/assert";

import { TestClock } from "../../src/clock/test-clock.ts";
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

const TIMENDUS_CORAX_PLUS_CPU_FREQUENCY = Frequency.fromInteger(500n);

/**
 * Corax+ performs more than 60 sprite draws while constructing its result
 * screen.
 *
 * Classic CHIP-8 permits at most one synchronized draw per 60 Hz display
 * interval, so one second is not sufficient once vertical-blank waiting is
 * modeled correctly. Two seconds provides ample deterministic time for the
 * ROM to reach its stable result loop.
 */
const TIMENDUS_CORAX_PLUS_EXECUTION_TIME = duration(2_000_000_000n as Duration);

/**
 * Successful Corax+ result screen.
 *
 * Timendus embeds the test-suite version at x=50..63, y=26..29. That small
 * rectangle is intentionally masked by snapshotDisplayIgnoringSuiteVersion()
 * so a suite-version label change does not redefine the opcode result itself.
 */
const EXPECTED_TIMENDUS_CORAX_PLUS_RESULT = [
  "................................................................",
  "..###.#.#.........###.#.#.........###.#.#.........###.###.......",
  "...##..#...#.#......#..#...#.#....###.###..#.#....#...##...#.#..",
  "....#.#.#..##.....##..#.#..##.....#.#...#..##.....##....#..##...",
  "..###.#.#..#......###.#.#..#......###...#..#......#...##...#....",
  "................................................................",
  "..#.#.#.#.........###.###.........###.###.........###.###.......",
  "..###..#...#.#....#.#.##...#.#....###.##...#.#....#....##..#.#..",
  "....#.#.#..##.....#.#.#....##.....#.#...#..##.....##....#..##...",
  "....#.#.#..#......###.###..#......###.##...#......#...###..#....",
  "................................................................",
  "..###.#.#.........###.###.........###.###.........###.###.......",
  "..##...#...#.#....###.#.#..#.#....###...#..#.#....#...##...#.#..",
  "....#.#.#..##.....#.#.#.#..##.....#.#..#...##.....##..#....##...",
  "..##..#.#..#......###.###..#......###..#...#......#...###..#....",
  "................................................................",
  "..###.#.#.........###.##..........###..##.............#.#.......",
  "....#..#...#.#....###..#...#.#....###.#....#.#....#.#..#...#.#..",
  "...#..#.#..##.....#.#..#...##.....#.#.###..##.....#.#.#.#..##...",
  "...#..#.#..#......###.###..#......###.###..#.......#..#.#..#....",
  "................................................................",
  "..###.#.#.........###.###.........###.###.......................",
  "..###..#...#.#....###...#..#.#....###.##...#.#..................",
  "....#.#.#..##.....#.#.##...##.....#.#.#....##...................",
  "..##..#.#..#......###.###..#......###.###..#....................",
  "................................................................",
  "..##..#.#.........###.###.........###..##.......................",
  "...#...#...#.#....###..##..#.#....#...#....#.#..................",
  "...#..#.#..##.....#.#...#..##.....##..###..##...................",
  "..###.#.#..#......###.###..#......#...###..#....................",
  "................................................................",
  "................................................................",
].join("\n");

Deno.test("Classic CHIP-8 passes the Timendus Corax+ opcode test ROM", async () => {
  const profile = CLASSIC_CHIP8_PROFILE;

  const romBytes = await Deno.readFile(new URL("./roms/3-corax+.ch8", import.meta.url));

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
      cpuFrequency: TIMENDUS_CORAX_PLUS_CPU_FREQUENCY,
    },
    profile.timerFrequency,
    profile.display.refreshFrequency,
  );

  runtime.resume();

  clock.advance(TIMENDUS_CORAX_PLUS_EXECUTION_TIME);

  runtime.tick();

  assertEquals(
    snapshotDisplayIgnoringSuiteVersion(context.displayBuffer),
    EXPECTED_TIMENDUS_CORAX_PLUS_RESULT,
  );
});

function snapshotDisplayIgnoringSuiteVersion(displayBuffer: DisplayBuffer): string {
  const rows: string[] = [];

  for (let y = 0; y < displayBuffer.height; y++) {
    let row = "";

    for (let x = 0; x < displayBuffer.width; x++) {
      const isSuiteVersionPixel = x >= 50 && y >= 26 && y < 30;

      row += !isSuiteVersionPixel && displayBuffer.getPixel(x, y) ? "#" : ".";
    }

    rows.push(row);
  }

  return rows.join("\n");
}
