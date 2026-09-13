import { assertEquals } from "@std/assert";

import {
  byte,
  CHIP48_PROFILE,
  Chip8Profile,
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
  Timer,
  VerticalBlank,
} from "../../mod.ts";

import { TestClock } from "../../src/clock/test-clock.ts";
import { TestRandomNumberGenerator } from "../../src/random/test-random-number-generator.ts";

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
      profile.display.specification,
      profile.compatibility.spriteOverflow,
    ),
    verticalBlank,
    keyboard: new KeyboardState(),
    font: new ClassicFont(profile.fontBaseAddress),
    randomNumberGenerator: new TestRandomNumberGenerator([byte(0)]),
    rplFlags: new RplFlags(),
    exitState: new ExitState(),
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
