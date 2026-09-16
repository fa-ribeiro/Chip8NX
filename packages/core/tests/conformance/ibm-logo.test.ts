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

const IBM_LOGO_CPU_FREQUENCY = Frequency.fromInteger(500n);

/**
 * The IBM Logo ROM contains six draw instructions.
 *
 * Classic CHIP-8 synchronizes Dxyn with vertical blank, so CPU scheduling
 * attempts can stall and retry while waiting for the 60 Hz display boundary.
 * 120 ms provides seven display intervals, enough for all six draws and the
 * intervening instructions to complete.
 */
const IBM_LOGO_EXECUTION_TIME = duration(120_000_000n as Duration);

const EXPECTED_IBM_LOGO = [
  "................................................................",
  "................................................................",
  "................................................................",
  "................................................................",
  "................................................................",
  "................................................................",
  "................................................................",
  "................................................................",
  "............########.#########...#####.........#####............",
  "................................................................",
  "............########.###########.######.......######............",
  "................................................................",
  "..............####.....###...###...#####.....#####..............",
  "................................................................",
  "..............####.....#######.....#######.#######..............",
  "................................................................",
  "..............####.....#######.....###.#######.###..............",
  "................................................................",
  "..............####.....###...###...###..#####..###..............",
  "................................................................",
  "............########.###########.#####...###...#####............",
  "................................................................",
  "............########.#########...#####....#....#####............",
  "................................................................",
  "................................................................",
  "................................................................",
  "................................................................",
  "................................................................",
  "................................................................",
  "................................................................",
  "................................................................",
  "................................................................",
].join("\n");

Deno.test(
  "Classic CHIP-8 renders the IBM logo with vertical-blank synchronized drawing",
  async () => {
    const profile = CLASSIC_CHIP8_PROFILE;

    const romBytes = await Deno.readFile(new URL("./roms/ibm-logo.ch8", import.meta.url));

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

    const cpu = new Cpu(
      context,
      new Decoder(),
      new InstructionExecutor(profile.instructionSet, profile.compatibility),
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
        cpuFrequency: IBM_LOGO_CPU_FREQUENCY,
      },
      profile.timerFrequency,
      profile.display.refreshFrequency,
    );

    runtime.resume();

    clock.advance(IBM_LOGO_EXECUTION_TIME);

    runtime.tick();
    assertEquals(snapshotDisplay(context.displayBuffer), EXPECTED_IBM_LOGO);
  },
);

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
