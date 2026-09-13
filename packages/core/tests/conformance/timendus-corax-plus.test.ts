import { assertEquals } from "@std/assert";

import {
  byte,
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
    displayBuffer: new DisplayBuffer(profile.display.specification, "clip"),
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
