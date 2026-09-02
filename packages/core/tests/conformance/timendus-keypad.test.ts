import { assert, assertEquals } from "@std/assert";
import { TestClock } from "../../src/clock/test-clock.ts";
import { address } from "../../src/core/types/address.ts";
import { type Byte, byte } from "../../src/core/types/byte.ts";
import { type Duration, duration } from "../../src/core/types/duration.ts";
import { Frequency } from "../../src/core/types/frequency.ts";
import { key } from "../../src/core/types/key.ts";
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

const TIMENDUS_KEYPAD_CPU_FREQUENCY = Frequency.fromInteger(500n);

/**
 * Gives the Keypad ROM enough emulated time to render its selected test screen
 * and settle into the keyboard polling loop.
 *
 * Classic display synchronization limits drawing to one sprite per display
 * frame, so the budget is intentionally based on emulated time rather than a
 * fixed number of CPU cycles.
 */
const TIMENDUS_KEYPAD_INITIALIZATION_TIME = duration(2_000_000_000n as Duration);

/**
 * Gives the keypad polling loop enough emulated time to complete at least one
 * full scan of all 16 CHIP-8 keys after an input transition.
 *
 * The ROM checks keys sequentially and performs several CHIP-8 instructions
 * per key. At the 500 Hz conformance CPU frequency, 100 ms is not sufficient
 * to guarantee that a changed key will be revisited from every possible loop
 * position.
 */
const TIMENDUS_KEYPAD_INPUT_SETTLE_TIME = duration(500_000_000n as Duration);

/**
 * Timendus uses the byte immediately before the normal CHIP-8 program start
 * address as its automated keypad-test selector.
 */
const TIMENDUS_KEYPAD_SELECTION_ADDRESS = address(0x1ff);

const TIMENDUS_KEYPAD_EX9E = byte(1);
const TIMENDUS_KEYPAD_EXA1 = byte(2);

/**
 * Key 1 occupies this seven-by-six region in the Timendus keypad display.
 *
 * The test ROM XORs a seven-by-six cursor sprite over the key glyph when that
 * key is considered active.
 */
const KEY_1_REGION = {
  x: 16,
  y: 2,
  width: 7,
  height: 6,
} as const;

const TEST_KEY = key(0x1);

const TIMENDUS_KEYPAD_FX0A = byte(3);

/**
 * Small deterministic time increment used to detect when the Keypad ROM has
 * armed its delay timer immediately before executing FX0A.
 */
const TIMENDUS_KEYPAD_WAIT_ENTRY_POLL_TIME = duration(1_000_000n as Duration);

/**
 * Maximum number of polling iterations allowed while waiting for the Keypad
 * ROM to reach its FX0A test.
 *
 * At one millisecond per iteration this permits up to two seconds of emulated
 * setup time without hard-coding an address inside the third-party ROM.
 */
const TIMENDUS_KEYPAD_WAIT_ENTRY_MAX_POLLS = 2_000;

/**
 * Keeps the selected key pressed long enough for the three-tick delay timer to
 * reach zero while FX0A remains blocked.
 */
const TIMENDUS_KEYPAD_KEY_HOLD_TIME = duration(100_000_000n as Duration);

/**
 * Gives the ROM enough time after key release to validate FX0A, render its
 * successful result, scan the keypad for released keys, and settle into its
 * next input wait.
 */
const TIMENDUS_KEYPAD_RESULT_SETTLE_TIME = duration(1_000_000_000n as Duration);

const TIMENDUS_KEYPAD_SUCCESS_REGION = {
  x: 16,
  y: 17,
  width: 32,
  height: 4,
} as const;

const EXPECTED_TIMENDUS_KEYPAD_SUCCESS = [
  ".#..#...#........##.###.###.##..",
  "#.#.#...#.......#...#.#.#.#.#.#.",
  "###.#...#.......#.#.#.#.#.#.#.#.",
  "#.#.###.###......##.###.###.##..",
].join("\n");

Deno.test("Classic CHIP-8 passes Timendus EX9E keypad behavior", async () => {
  const harness = await createKeypadHarness(TIMENDUS_KEYPAD_EX9E);

  advanceRuntime(harness, TIMENDUS_KEYPAD_INITIALIZATION_TIME);

  const releasedSnapshot = snapshotRegion(
    harness.context.displayBuffer,
    KEY_1_REGION.x,
    KEY_1_REGION.y,
    KEY_1_REGION.width,
    KEY_1_REGION.height,
  );
  const releasedPixels = countLitPixels(releasedSnapshot);

  harness.keyboard.press(TEST_KEY);

  advanceRuntime(harness, TIMENDUS_KEYPAD_INPUT_SETTLE_TIME);

  const pressedSnapshot = snapshotRegion(
    harness.context.displayBuffer,
    KEY_1_REGION.x,
    KEY_1_REGION.y,
    KEY_1_REGION.width,
    KEY_1_REGION.height,
  );
  const pressedPixels = countLitPixels(pressedSnapshot);

  assert(pressedPixels > releasedPixels, "EX9E should highlight key 1 while it is pressed");

  harness.keyboard.release(TEST_KEY);

  advanceRuntime(harness, TIMENDUS_KEYPAD_INPUT_SETTLE_TIME);

  assertEquals(
    snapshotRegion(
      harness.context.displayBuffer,
      KEY_1_REGION.x,
      KEY_1_REGION.y,
      KEY_1_REGION.width,
      KEY_1_REGION.height,
    ),
    releasedSnapshot,
    "EX9E should restore key 1 after it is released",
  );
});

Deno.test("Classic CHIP-8 passes Timendus EXA1 keypad behavior", async () => {
  const harness = await createKeypadHarness(TIMENDUS_KEYPAD_EXA1);

  advanceRuntime(harness, TIMENDUS_KEYPAD_INITIALIZATION_TIME);

  const releasedSnapshot = snapshotRegion(
    harness.context.displayBuffer,
    KEY_1_REGION.x,
    KEY_1_REGION.y,
    KEY_1_REGION.width,
    KEY_1_REGION.height,
  );
  const releasedPixels = countLitPixels(releasedSnapshot);

  harness.keyboard.press(TEST_KEY);

  advanceRuntime(harness, TIMENDUS_KEYPAD_INPUT_SETTLE_TIME);

  const pressedSnapshot = snapshotRegion(
    harness.context.displayBuffer,
    KEY_1_REGION.x,
    KEY_1_REGION.y,
    KEY_1_REGION.width,
    KEY_1_REGION.height,
  );
  const pressedPixels = countLitPixels(pressedSnapshot);

  assert(
    pressedPixels < releasedPixels,
    "EXA1 should stop highlighting key 1 while it is pressed",
  );

  harness.keyboard.release(TEST_KEY);

  advanceRuntime(harness, TIMENDUS_KEYPAD_INPUT_SETTLE_TIME);

  assertEquals(
    snapshotRegion(
      harness.context.displayBuffer,
      KEY_1_REGION.x,
      KEY_1_REGION.y,
      KEY_1_REGION.width,
      KEY_1_REGION.height,
    ),
    releasedSnapshot,
    "EXA1 should highlight key 1 again after it is released",
  );
});

interface KeypadHarness {
  readonly context: ExecutionContext;
  readonly keyboard: TestKeyboard;
  readonly clock: TestClock;
  readonly runtime: Chip8Runtime;
}

async function createKeypadHarness(selection: Byte): Promise<KeypadHarness> {
  const profile = CLASSIC_CHIP8_PROFILE;

  const romBytes = await Deno.readFile(new URL("./roms/6-keypad.ch8", import.meta.url));
  const program = new MemoryImage(romBytes);

  const delayTimer = new Timer();
  const soundTimer = new Timer();
  const verticalBlank = new VerticalBlank();
  const keyboard = new TestKeyboard();

  const context: ExecutionContext = {
    registers: new Registers(),
    memory: new Ram(profile.memorySize),
    stack: new Stack(profile.stackCapacity),
    programCounter: new ProgramCounter(profile.programStartAddress),
    indexRegister: new IndexRegister(),
    delayTimer,
    soundTimer,
    displayBuffer: new DisplayBuffer(profile.display.width, profile.display.height),
    verticalBlank,
    keyboard,
    font: new ClassicFont(profile.fontBaseAddress),
    randomNumberGenerator: new TestRandomNumberGenerator([byte(0)]),
  };

  const initializer = new MachineInitializer(new MemoryImageLoader());

  initializer.initialize(context, profile, program);

  // The initializer must run first because machine initialization clears RAM.
  context.memory.write(TIMENDUS_KEYPAD_SELECTION_ADDRESS, selection);

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
      cpuFrequency: TIMENDUS_KEYPAD_CPU_FREQUENCY,
    },
    profile.timerFrequency,
    profile.display.refreshFrequency,
  );

  runtime.resume();

  return {
    context,
    keyboard,
    clock,
    runtime,
  };
}

function advanceRuntime(harness: KeypadHarness, amount: Duration): void {
  harness.clock.advance(amount);
  harness.runtime.tick();
}

function advanceUntilDelayTimerStarts(harness: KeypadHarness): void {
  for (let poll = 0; poll < TIMENDUS_KEYPAD_WAIT_ENTRY_MAX_POLLS; poll++) {
    advanceRuntime(harness, TIMENDUS_KEYPAD_WAIT_ENTRY_POLL_TIME);

    if (harness.context.delayTimer.getValue() > 0) {
      return;
    }
  }

  throw new Error("Timendus Keypad ROM did not reach the FX0A delay-timer setup");
}

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

function countLitPixels(snapshot: string): number {
  return [...snapshot].filter((pixel) => pixel === "#").length;
}

Deno.test("Classic CHIP-8 passes Timendus FX0A keypad behavior", async () => {
  const harness = await createKeypadHarness(TIMENDUS_KEYPAD_FX0A);

  /*
   * The ROM performs:
   *
   *   V0 := 3
   *   delay := V0
   *   V0 := key
   *
   * Detecting the delay timer becoming non-zero lets the test inject the key
   * immediately before FX0A begins waiting without depending on a private ROM
   * instruction address.
   */
  advanceUntilDelayTimerStarts(harness);

  assert(
    harness.context.delayTimer.getValue() > 0,
    "Keypad ROM should arm the delay timer before FX0A",
  );

  /*
   * The instruction immediately following FX15 is FX0A, so after FX15
   * completes the program counter already points at the wait instruction.
   */
  const waitingProgramCounter = harness.context.programCounter.getValue();

  /*
   * Press before FX0A executes.
   *
   * A broken implementation that immediately returns an already-pressed key
   * will fail Timendus' NOT HALTING check because the delay timer will still
   * be non-zero.
   */
  harness.keyboard.press(TEST_KEY);

  advanceRuntime(harness, TIMENDUS_KEYPAD_KEY_HOLD_TIME);

  /*
   * Correct FX0A behavior keeps retrying the same instruction while the key is
   * held.
   */
  assertEquals(
    harness.context.programCounter.getValue(),
    waitingProgramCounter,
    "FX0A should remain blocked while the selected key is still pressed",
  );

  /*
   * Runtime scheduling must continue even though CPU execution is blocked on
   * FX0A. Timendus uses this exact condition to detect interpreters that halt
   * the entire machine instead of only waiting the instruction.
   */
  assertEquals(
    harness.context.delayTimer.getValue(),
    byte(0),
    "delay timer should continue counting down while FX0A waits",
  );

  harness.keyboard.release(TEST_KEY);

  advanceRuntime(harness, TIMENDUS_KEYPAD_RESULT_SETTLE_TIME);

  assertEquals(
    snapshotRegion(
      harness.context.displayBuffer,
      TIMENDUS_KEYPAD_SUCCESS_REGION.x,
      TIMENDUS_KEYPAD_SUCCESS_REGION.y,
      TIMENDUS_KEYPAD_SUCCESS_REGION.width,
      TIMENDUS_KEYPAD_SUCCESS_REGION.height,
    ),
    EXPECTED_TIMENDUS_KEYPAD_SUCCESS,
    "FX0A should wait for release and reach the Timendus ALL GOOD result",
  );
});
