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
import type { Chip8Profile } from "../../src/machine/chip8-profile.ts";
import { CHIP48_PROFILE } from "../../src/machine/chip48/chip48-profile.ts";
import { CLASSIC_CHIP8_PROFILE } from "../../src/machine/classic/classic-chip8-profile.ts";
import { MachineInitializer } from "../../src/machine/machine-initializer.ts";
import { MemoryImageLoader } from "../../src/memory/memory-image-loader.ts";
import { MemoryImage } from "../../src/memory/memory-image.ts";
import { Ram } from "../../src/memory/ram.ts";
import { TestRandomNumberGenerator } from "../../src/random/test-random-number-generator.ts";
import { Chip8Runtime } from "../../src/runtime/chip8-runtime.ts";
import { Scheduler } from "../../src/scheduler/scheduler.ts";
import { Timer } from "../../src/timer/timer.ts";

const CPU_FREQUENCY = Frequency.fromInteger(2_000n);

const SETTLE_TIME = duration(5_000_000_000n as Duration);

const CLASSIC_EXPECTED = `................................................................
................................................................
.##.......#...........#........#.......................#....#.#.
.#.#..#..###..#..###.###..#...##..................#.#.##....#.#.
.#.#.#.#..#..#.#.#....#..#.#.#.#..................#.#..#....###.
.#.#.##...#..##..#....#..##..#.#..................#.#..#......#.
.##...##...#..##.###...#..##..##...................#..###.#...#.
................................................................
................................................................
................................................................
.###.#.#.#.###.....###..........................................
.#...#.#.#.#.#.....#.#..........................................
.#...###.#.###.###.###..........................................
.#...#.#.#.#.......#.#..........................................
.###.#.#.#.#.......###..........................................
................................................................
................................................................
................................................................
.#.#.###.###...........###.#.#.###...........##..#.#.###.#......
.#.#.#...#.#..#..#.#...#...#.#.#.......#.#...#.#.#.#..#..#...#.#
.#.#.###.##..###.##....###.###.###.###.##....#.#.###..#..#...##.
.#.#.#...#.#..#..#.......#.#.#.#.......#.....#.#.###..#..#...#..
..#..#...#.#...........###.#.#.#.............##..#.#..#..###....
................................................................
.#.#.###.#.#..#..........#.#.#.###...........#.#.###.###........
.###.#...###.##..#.#.....#.###.#.#.....#.#...#.#.#.#.#.#.....#.#
.###.##..###..#..##......#.###.###.###.##....###.##..###.###.##.
.#.#.#...#.#..#..#.....#.#.#.#.#.......#.....###.#.#.#.......#..
.#.#.###.#.#.###........#..#.#.#.............#.#.#.#.#..........
................................................................
................................................................
................................................................`;

const CHIP48_EXPECTED = `................................................................
................................................................
.##.......#...........#........#.......................#....#.#.
.#.#..#..###..#..###.###..#...##..................#.#.##....#.#.
.#.#.#.#..#..#.#.#....#..#.#.#.#..................#.#..#....###.
.#.#.##...#..##..#....#..##..#.#..................#.#..#......#.
.##...##...#..##.###...#..##..##...................#..###.#...#.
................................................................
................................................................
................................................................
.###.#.#.#.###.....#.#.###......................................
.#...#.#.#.#.#.....#.#.#.#......................................
.#...###.#.###.###.###.###......................................
.#...#.#.#.#.........#.#.#......................................
.###.#.#.#.#.........#.###......................................
................................................................
................................................................
................................................................
.#.#.###.###...........###.#.#.###...........##..#.#.###.#......
.#.#.#...#.#.....#.#...#...#.#.#....#..#.#...#.#.#.#..#..#...#.#
.#.#.###.##..###.##....###.###.###.###.##....#.#.###..#..#...##.
.#.#.#...#.#.....#.......#.#.#.#....#..#.....#.#.###..#..#...#..
..#..#...#.#...........###.#.#.#.............##..#.#..#..###....
................................................................
.#.#.###.#.#.#.#.........#.#.#.###...........#.#.###.###........
.###.#...###.#.#.#.#.....#.###.#.#..#..#.#...#.#.#.#.#.#.....#.#
.###.##..###..#..##......#.###.###.###.##....###.##..###.###.##.
.#.#.#...#.#.#.#.#.....#.#.#.#.#....#..#.....###.#.#.#.......#..
.#.#.###.#.#.#.#........#..#.#.#.............#.#.#.#.#..........
................................................................
................................................................
................................................................`;

const romBytes = await Deno.readFile(
  new URL("./roms/variant-detection-1.4.ch8", import.meta.url),
);

const program = new MemoryImage(romBytes);

Deno.test("Classic CHIP-8 passes the Gulrak variant detection test", () => {
  assertEquals(runVariantDetection(CLASSIC_CHIP8_PROFILE), CLASSIC_EXPECTED);
});

Deno.test("CHIP-48 passes the Gulrak variant detection test", () => {
  assertEquals(runVariantDetection(CHIP48_PROFILE), CHIP48_EXPECTED);
});

function runVariantDetection(profile: Chip8Profile): string {
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
      profile.display.width,
      profile.display.height,
      profile.compatibility.spriteOverflow,
    ),
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
      cpuFrequency: CPU_FREQUENCY,
    },
    profile.timerFrequency,
    profile.display.refreshFrequency,
  );

  runtime.resume();

  clock.advance(SETTLE_TIME);
  runtime.tick();

  const first = snapshotDisplay(context.displayBuffer);

  clock.advance(SETTLE_TIME);
  runtime.tick();

  const second = snapshotDisplay(context.displayBuffer);

  assertEquals(second, first, "Variant Detection Test result screen should be stable");

  return second;
}

function snapshotDisplay(displayBuffer: DisplayBuffer): string {
  const rows: string[] = [];

  for (let y = 0; y < displayBuffer.height; y++) {
    let row = "";

    for (let x = 0; x < displayBuffer.width; x++) {
      row += displayBuffer.getPixel(x, y) ? "#" : ".";
    }

    rows.push(row);
  }

  return rows.join("\n");
}
