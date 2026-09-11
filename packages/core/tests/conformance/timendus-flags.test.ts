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

const TIMENDUS_FLAGS_CPU_FREQUENCY = Frequency.fromInteger(500n);

/**
 * Gives the Flags ROM two seconds of emulated execution at 500 Hz.
 *
 * The ROM draws its complete result screen and then remains in a stable loop,
 * so the acceptance criterion is the rendered result glyphs rather than an
 * exact completion cycle.
 */
const TIMENDUS_FLAGS_EXECUTION_TIME = duration(2_000_000_000n as Duration);

/**
 * Timendus' three-row success glyph, cropped to the three significant columns.
 *
 * The upstream ROM stores it as 0b10100000, 0b11000000, followed by the first
 * byte of the character table (0b10000000).
 */
const EXPECTED_FLAG_OK = ["#.#", "##.", "#.."].join("\n");

const EXPECTED_FLAG_RESULTS = [
  // HAPPY: no overflow, borrow, or shifted-out bit.
  { name: "HAPPY 8xy1 / result", x: 27, y: 1 },
  { name: "HAPPY 8xy1 / VF", x: 31, y: 1 },
  { name: "HAPPY 8xy1 / VF as vY", x: 35, y: 1 },

  { name: "HAPPY 8xy2 / result", x: 49, y: 1 },
  { name: "HAPPY 8xy2 / VF", x: 53, y: 1 },
  { name: "HAPPY 8xy2 / VF as vY", x: 57, y: 1 },

  { name: "HAPPY 8xy3 / result", x: 5, y: 6 },
  { name: "HAPPY 8xy3 / VF", x: 9, y: 6 },
  { name: "HAPPY 8xy3 / VF as vY", x: 13, y: 6 },

  { name: "HAPPY 8xy4 / result", x: 27, y: 6 },
  { name: "HAPPY 8xy4 / VF", x: 31, y: 6 },
  { name: "HAPPY 8xy4 / VF as vY", x: 35, y: 6 },
  { name: "HAPPY 8xy4 / VF as vX", x: 39, y: 6 },

  { name: "HAPPY 8xy5 / result", x: 49, y: 6 },
  { name: "HAPPY 8xy5 / VF", x: 53, y: 6 },
  { name: "HAPPY 8xy5 / VF as vY", x: 57, y: 6 },
  { name: "HAPPY 8xy5 / VF as vX", x: 61, y: 6 },

  { name: "HAPPY 8xy6 / result", x: 5, y: 11 },
  { name: "HAPPY 8xy6 / VF", x: 9, y: 11 },
  { name: "HAPPY 8xy6 / VF operand", x: 13, y: 11 },

  { name: "HAPPY 8xy7 / result", x: 27, y: 11 },
  { name: "HAPPY 8xy7 / VF", x: 31, y: 11 },
  { name: "HAPPY 8xy7 / VF as vY", x: 35, y: 11 },
  { name: "HAPPY 8xy7 / VF as vX", x: 39, y: 11 },

  { name: "HAPPY 8xyE / result", x: 49, y: 11 },
  { name: "HAPPY 8xyE / VF", x: 53, y: 11 },
  { name: "HAPPY 8xyE / VF operand", x: 57, y: 11 },

  // CARRY: overflow, borrow, or shifted-out bit cases.
  { name: "CARRY 8xy4 / result", x: 27, y: 17 },
  { name: "CARRY 8xy4 / VF", x: 31, y: 17 },
  { name: "CARRY 8xy4 / VF as vY", x: 35, y: 17 },
  { name: "CARRY 8xy4 / VF as vX", x: 39, y: 17 },

  { name: "CARRY 8xy5 / result", x: 49, y: 17 },
  { name: "CARRY 8xy5 / VF", x: 53, y: 17 },
  { name: "CARRY 8xy5 / VF as vY", x: 57, y: 17 },
  { name: "CARRY 8xy5 / VF as vX", x: 61, y: 17 },

  { name: "CARRY 8xy6 / result", x: 5, y: 22 },
  { name: "CARRY 8xy6 / VF", x: 9, y: 22 },
  { name: "CARRY 8xy6 / VF operand", x: 13, y: 22 },

  { name: "CARRY 8xy7 / result", x: 27, y: 22 },
  { name: "CARRY 8xy7 / VF", x: 31, y: 22 },
  { name: "CARRY 8xy7 / VF as vY", x: 35, y: 22 },
  { name: "CARRY 8xy7 / VF as vX", x: 39, y: 22 },

  { name: "CARRY 8xyE / result", x: 49, y: 22 },
  { name: "CARRY 8xyE / VF", x: 53, y: 22 },
  { name: "CARRY 8xyE / VF operand", x: 57, y: 22 },

  // OTHER: Fx1E with a normal register and with VF as vX.
  { name: "OTHER Fx1E / regular register", x: 31, y: 28 },
  { name: "OTHER Fx1E / VF as vX", x: 35, y: 28 },
] as const;

Deno.test("Classic CHIP-8 passes the Timendus Flags test ROM", async () => {
  const profile = CLASSIC_CHIP8_PROFILE;

  const romBytes = await Deno.readFile(new URL("./roms/4-flags.ch8", import.meta.url));

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
      cpuFrequency: TIMENDUS_FLAGS_CPU_FREQUENCY,
    },
    profile.timerFrequency,
    profile.display.refreshFrequency,
  );

  runtime.resume();

  clock.advance(TIMENDUS_FLAGS_EXECUTION_TIME);

  runtime.tick();

  for (const result of EXPECTED_FLAG_RESULTS) {
    assertEquals(
      snapshotRegion(context.displayBuffer, result.x, result.y, 3, 3),
      EXPECTED_FLAG_OK,
      result.name,
    );
  }
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
