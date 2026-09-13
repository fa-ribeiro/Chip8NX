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

const CORAX89_CPU_FREQUENCY = Frequency.fromInteger(500n);

/**
 * 500 CPU cycles at 500 Hz gives the ROM one second of emulated execution.
 *
 * The ROM reaches a stable result screen and then loops indefinitely without
 * modifying the framebuffer, so the conformance criterion is the final
 * observable display rather than an exact completion cycle.
 */
const CORAX89_EXECUTION_TIME = duration(1_000_000_000n as Duration);

const EXPECTED_CORAX89_RESULT = [
  "................................................................",
  ".###.#.#..###.#.#......###.###..###.#.#.....###..##.###.#.#.....",
  "..##..#...#.#.##.......#.#.##...#.#.##......###..#..#.#.##......",
  "...#.#.#..#.#.#.#......#.#.#....#.#.#.#.....#.#...#.#.#.#.#.....",
  ".###.#.#..###.#.#......###.###..###.#.#.....###..#..###.#.#.....",
  "................................................................",
  ".#.#.#.#..###.#.#......###.###..###.#.#.....###.###.###.#.#.....",
  ".###..#...#.#.##.......###.#.#..#.#.##......###.#...#.#.##......",
  "...#.#.#..#.#.#.#......#.#.#.#..#.#.#.#.....#.#.###.#.#.#.#.....",
  "...#.#.#..###.#.#......###.###..###.#.#.....###.###.###.#.#.....",
  "................................................................",
  "..##.#.#..###.#.#......###.##...###.#.#.....###.###.###.#.#.....",
  "..#...#...#.#.##.......###..#...#.#.##......###.##..#.#.##......",
  "...#.#.#..#.#.#.#......#.#..#...#.#.#.#.....#.#.#...#.#.#.#.....",
  "..#..#.#..###.#.#......###.###..###.#.#.....###.###.###.#.#.....",
  "................................................................",
  ".###.#.#..###.#.#......###.###..###.#.#.....###..##.###.#.#.....",
  "...#..#...#.#.##.......###...#..#.#.##......#....#..#.#.##......",
  "...#.#.#..#.#.#.#......#.#.##...#.#.#.#.....##....#.#.#.#.#.....",
  "...#.#.#..###.#.#......###.###..###.#.#.....#....#..###.#.#.....",
  "................................................................",
  ".###.#.#..###.#.#......###.###..###.#.#.....###.###.###.#.#.....",
  ".###..#...#.#.##.......###..##..#.#.##......#....##.#.#.##......",
  "...#.#.#..#.#.#.#......#.#...#..#.#.#.#.....##....#.#.#.#.#.....",
  ".###.#.#..###.#.#......###.###..###.#.#.....#...###.###.#.#.....",
  "................................................................",
  "..#..#.#..###.#.#......###.#.#..###.#.#.....##..#.#.###.#.#.....",
  ".#.#..#...#.#.##.......###.###..#.#.##.......#...#..#.#.##......",
  ".###.#.#..#.#.#.#......#.#...#..#.#.#.#......#..#.#.#.#.#.#.....",
  ".#.#.#.#..###.#.#......###...#..###.#.#.....###.#.#.###.#.#.....",
  "................................................................",
  "................................................................",
].join("\n");

Deno.test("Classic CHIP-8 passes the corax89 opcode test ROM", async () => {
  const profile = CLASSIC_CHIP8_PROFILE;

  const romBytes = await Deno.readFile(new URL("./roms/test_opcode.ch8", import.meta.url));

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
      cpuFrequency: CORAX89_CPU_FREQUENCY,
    },
    profile.timerFrequency,
    profile.display.refreshFrequency,
  );

  runtime.resume();

  clock.advance(CORAX89_EXECUTION_TIME);

  runtime.tick();

  assertEquals(snapshotDisplay(context.displayBuffer), EXPECTED_CORAX89_RESULT);
});

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
