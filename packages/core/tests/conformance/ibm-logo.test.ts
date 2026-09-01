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
import { ClassicFont } from "../../src/font/classic-font.ts";
import { Decoder } from "../../src/instruction/decoder.ts";
import { TestKeyboard } from "../../src/keyboard/test-keyboard.ts";
import { CLASSIC_CHIP8_PROFILE } from "../../src/machine/classic/classic-chip8-profile.ts";
import { MachineInitializer } from "../../src/machine/machine-initializer.ts";
import { MemoryImageLoader } from "../../src/memory/memory-image-loader.ts";
import { MemoryImage } from "../../src/memory/memory-image.ts";
import { Ram } from "../../src/memory/ram.ts";
import { TestRandomNumberGenerator } from "../../src/random/test-random-number-generator.ts";
import { Chip8Runtime } from "../../src/runtime/chip8-runtime.ts";
import { Scheduler } from "../../src/scheduler/scheduler.ts";
import { Timer } from "../../src/timer/timer.ts";

const IBM_LOGO_CPU_FREQUENCY = Frequency.fromInteger(500n);

/**
 * The IBM logo is complete after exactly 20 CPU cycles.
 *
 * At 500 Hz:
 *
 *     20 / 500 seconds = 40 milliseconds
 */
const IBM_LOGO_EXECUTION_TIME = duration(40_000_000n as Duration);

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
  "Classic CHIP-8 renders the IBM logo after 20 CPU cycles",
  async () => {
    const profile = CLASSIC_CHIP8_PROFILE;

    const romBytes = await Deno.readFile(
      new URL("./roms/ibm-logo.ch8", import.meta.url),
    );

    const program = new MemoryImage(romBytes);

    const delayTimer = new Timer();
    const soundTimer = new Timer();

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
      ),
      keyboard: new TestKeyboard(),
      font: new ClassicFont(profile.fontBaseAddress),
      randomNumberGenerator: new TestRandomNumberGenerator([byte(0)]),
    };

    const initializer = new MachineInitializer(new MemoryImageLoader());

    initializer.initialize(context, profile, program);

    const cpu = new Cpu(context, new Decoder(), new InstructionExecutor());

    const clock = new TestClock();
    const scheduler = new Scheduler(clock);

    const runtime = new Chip8Runtime(
      cpu,
      delayTimer,
      soundTimer,
      scheduler,
      {
        cpuFrequency: IBM_LOGO_CPU_FREQUENCY,
      },
      profile.timerFrequency,
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
