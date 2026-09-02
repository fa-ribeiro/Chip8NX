import { assertEquals, assertThrows } from "@std/assert";

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
import { registerIndex } from "../../src/cpu/registers/register-index.ts";
import { Registers } from "../../src/cpu/registers/registers.ts";
import { Stack } from "../../src/cpu/stack/stack.ts";
import { DisplayBuffer } from "../../src/display/display-buffer.ts";
import { VerticalBlank } from "../../src/display/vertical-blank.ts";
import { ClassicFont } from "../../src/font/classic-font.ts";
import { Decoder } from "../../src/instruction/decoder.ts";
import { KeyboardState } from "../../src/keyboard/keyboard-state.ts";
import { CLASSIC_CHIP8_PROFILE } from "../../src/machine/classic/classic-chip8-profile.ts";
import { Ram } from "../../src/memory/ram.ts";
import { TestRandomNumberGenerator } from "../../src/random/test-random-number-generator.ts";
import { Chip8Runtime } from "../../src/runtime/chip8-runtime.ts";
import { Scheduler } from "../../src/scheduler/scheduler.ts";
import { Timer } from "../../src/timer/timer.ts";

interface RuntimeHarness {
  readonly runtime: Chip8Runtime;
  readonly clock: TestClock;
  readonly context: ExecutionContext;
  readonly delayTimer: Timer;
  readonly soundTimer: Timer;
  readonly verticalBlank: VerticalBlank;
}

function createRuntime(cpuFrequency: Frequency = Frequency.fromInteger(500n)): RuntimeHarness {
  const profile = CLASSIC_CHIP8_PROFILE;

  const registers = new Registers();
  const memory = new Ram(profile.memorySize);
  const delayTimer = new Timer();
  const soundTimer = new Timer();
  const verticalBlank = new VerticalBlank();
  const context: ExecutionContext = {
    registers,
    memory,
    stack: new Stack(profile.stackCapacity),
    programCounter: new ProgramCounter(profile.programStartAddress),
    indexRegister: new IndexRegister(),
    soundTimer,
    delayTimer,
    displayBuffer: new DisplayBuffer(profile.display.width, profile.display.height),
    verticalBlank: verticalBlank,
    keyboard: new KeyboardState(),
    font: new ClassicFont(profile.fontBaseAddress),
    randomNumberGenerator: new TestRandomNumberGenerator([byte(0)]),
  };

  /*
   * Fill the test program with repeated:
   *
   *     ADD V0, 1
   *
   * This makes every CPU step directly observable through V0.
   */
  for (let offset = 0; offset < 64; offset += 2) {
    memory.write(address(profile.programStartAddress + offset), byte(0x70));

    memory.write(address(profile.programStartAddress + offset + 1), byte(0x01));
  }

  const cpu = new Cpu(context, new Decoder(), new InstructionExecutor());

  const clock = new TestClock();
  const scheduler = new Scheduler(clock);

  const runtime = new Chip8Runtime(
    cpu,
    delayTimer,
    soundTimer,
    verticalBlank,
    scheduler,
    {
      cpuFrequency,
    },
    profile.timerFrequency,
    profile.display.refreshFrequency,
  );

  return { runtime, clock, context, delayTimer, soundTimer, verticalBlank };
}

function advanceClock(clock: TestClock, nanoseconds: bigint): void {
  clock.advance(duration(nanoseconds as Duration));
}

Deno.test("Chip8Runtime starts paused", () => {
  const { runtime } = createRuntime();

  assertEquals(runtime.isPaused, true);
});

Deno.test("Chip8Runtime does not execute CPU or timers while paused", () => {
  const { runtime, clock, context, delayTimer, soundTimer } = createRuntime();

  delayTimer.setValue(byte(2));
  soundTimer.setValue(byte(3));

  advanceClock(clock, 20_000_000n);

  runtime.tick();

  assertEquals(context.registers.get(registerIndex(0)), byte(0));

  assertEquals(delayTimer.getValue(), byte(2));
  assertEquals(soundTimer.getValue(), byte(3));
});

Deno.test("Chip8Runtime schedules CPU execution and timer countdown", () => {
  const { runtime, clock, context, delayTimer, soundTimer } = createRuntime();

  delayTimer.setValue(byte(2));
  soundTimer.setValue(byte(3));

  runtime.resume();

  advanceClock(clock, 20_000_000n);

  runtime.tick();

  /*
   * 500 Hz over 20 ms produces ten CPU executions.
   */
  assertEquals(context.registers.get(registerIndex(0)), byte(10));

  /*
   * 60 Hz has one deadline within the first 20 ms.
   */
  assertEquals(delayTimer.getValue(), byte(1));
  assertEquals(soundTimer.getValue(), byte(2));
});

Deno.test("Chip8Runtime pause freezes CPU execution and timer countdown", () => {
  const { runtime, clock, context, delayTimer } = createRuntime();

  delayTimer.setValue(byte(10));

  runtime.resume();

  advanceClock(clock, 4_000_000n);
  runtime.tick();

  assertEquals(context.registers.get(registerIndex(0)), byte(2));

  runtime.pause();

  assertEquals(runtime.isPaused, true);

  advanceClock(clock, 1_000_000_000n);
  runtime.tick();

  assertEquals(context.registers.get(registerIndex(0)), byte(2));

  assertEquals(delayTimer.getValue(), byte(10));
});

Deno.test("Chip8Runtime resume does not accumulate paused execution debt", () => {
  const { runtime, clock, context } = createRuntime();

  runtime.resume();

  advanceClock(clock, 2_000_000n);
  runtime.tick();

  assertEquals(context.registers.get(registerIndex(0)), byte(1));

  runtime.pause();

  advanceClock(clock, 5_000_000_000n);
  runtime.tick();

  runtime.resume();

  /*
   * Resuming itself must not execute five seconds of missed work.
   */
  runtime.tick();

  assertEquals(context.registers.get(registerIndex(0)), byte(1));

  advanceClock(clock, 2_000_000n);
  runtime.tick();

  assertEquals(context.registers.get(registerIndex(0)), byte(2));
});

Deno.test("Chip8Runtime pause and resume are idempotent", () => {
  const { runtime, clock, context } = createRuntime();

  runtime.pause();
  runtime.pause();

  runtime.resume();
  runtime.resume();

  advanceClock(clock, 2_000_000n);
  runtime.tick();

  assertEquals(context.registers.get(registerIndex(0)), byte(1));

  runtime.pause();
  runtime.pause();

  advanceClock(clock, 10_000_000n);
  runtime.tick();

  assertEquals(context.registers.get(registerIndex(0)), byte(1));
});

Deno.test("Chip8Runtime step executes exactly one instruction while paused", () => {
  const { runtime, context, delayTimer, soundTimer } = createRuntime();

  delayTimer.setValue(byte(10));
  soundTimer.setValue(byte(20));

  runtime.step();

  assertEquals(context.registers.get(registerIndex(0)), byte(1));

  assertEquals(
    context.programCounter.getValue(),
    address(CLASSIC_CHIP8_PROFILE.programStartAddress + 2),
  );

  assertEquals(delayTimer.getValue(), byte(10));
  assertEquals(soundTimer.getValue(), byte(20));
});

Deno.test("Chip8Runtime rejects single stepping while running", () => {
  const { runtime } = createRuntime();

  runtime.resume();

  assertThrows(() => runtime.step(), Error, "Cannot step while runtime is running.");
});

Deno.test("Chip8Runtime processes timers before CPU on an exact deadline tie", () => {
  const { runtime, clock, context, delayTimer } = createRuntime(
    CLASSIC_CHIP8_PROFILE.timerFrequency,
  );

  /*
   * First instruction:
   *
   *     LD DT, V0
   */
  context.memory.write(CLASSIC_CHIP8_PROFILE.programStartAddress, byte(0xf0));

  context.memory.write(address(CLASSIC_CHIP8_PROFILE.programStartAddress + 1), byte(0x15));

  context.registers.set(registerIndex(0), byte(5));

  delayTimer.setValue(byte(1));

  runtime.resume();

  advanceClock(clock, 16_666_667n);
  runtime.tick();

  /*
   * Both tasks have reached their first 60 Hz deadline.
   *
   * Timer first:
   *     DT: 1 -> 0
   *
   * Then CPU executes LD DT, V0:
   *     DT: 0 -> 5
   */
  assertEquals(delayTimer.getValue(), byte(5));
});

Deno.test("Chip8Runtime does not signal vertical blank while paused", () => {
  const { runtime, clock, verticalBlank } = createRuntime();

  advanceClock(clock, 20_000_000n);

  runtime.tick();

  assertEquals(verticalBlank.consume(), false);
});

Deno.test("Chip8Runtime schedules display-frame boundaries", () => {
  const { runtime, clock, verticalBlank } = createRuntime();

  runtime.resume();

  advanceClock(clock, 20_000_000n);

  runtime.tick();

  assertEquals(verticalBlank.consume(), true);
  assertEquals(verticalBlank.consume(), false);
});

Deno.test("Chip8Runtime pause does not accumulate vertical blank debt", () => {
  const { runtime, clock, verticalBlank } = createRuntime();

  runtime.resume();

  advanceClock(clock, 20_000_000n);
  runtime.tick();

  assertEquals(verticalBlank.consume(), true);

  runtime.pause();

  advanceClock(clock, 1_000_000_000n);
  runtime.tick();

  assertEquals(verticalBlank.consume(), false);

  runtime.resume();
  runtime.tick();

  assertEquals(verticalBlank.consume(), false);
});

Deno.test("Chip8Runtime step allows a draw instruction to complete while paused", () => {
  const { runtime, context, verticalBlank } = createRuntime();

  /*
   * First instruction:
   *
   *     DRW V0, V1, 1
   */
  context.memory.write(CLASSIC_CHIP8_PROFILE.programStartAddress, byte(0xd0));

  context.memory.write(address(CLASSIC_CHIP8_PROFILE.programStartAddress + 1), byte(0x11));

  context.indexRegister.setValue(address(0x300));
  context.memory.write(address(0x300), byte(0b1000_0000));

  context.registers.set(registerIndex(0), byte(2));
  context.registers.set(registerIndex(1), byte(3));

  assertEquals(verticalBlank.isPending, false);

  runtime.step();

  assertEquals(context.displayBuffer.getPixel(2, 3), true);

  assertEquals(
    context.programCounter.getValue(),
    address(CLASSIC_CHIP8_PROFILE.programStartAddress + 2),
  );

  assertEquals(verticalBlank.isPending, false);
});

Deno.test("Chip8Runtime step does not leave a temporary vertical blank pending", () => {
  const { runtime, context, verticalBlank } = createRuntime();

  assertEquals(verticalBlank.isPending, false);

  runtime.step();

  assertEquals(context.registers.get(registerIndex(0)), byte(1));
  assertEquals(verticalBlank.isPending, false);
});

Deno.test("Chip8Runtime step preserves an existing vertical blank when unused", () => {
  const { runtime, context, verticalBlank } = createRuntime();

  verticalBlank.signal();

  runtime.step();

  assertEquals(context.registers.get(registerIndex(0)), byte(1));
  assertEquals(verticalBlank.isPending, true);
});
