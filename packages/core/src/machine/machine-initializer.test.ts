import { assertEquals, assertThrows } from "@std/assert";

import { address } from "../../src/core/types/address.ts";
import { byte } from "../../src/core/types/byte.ts";
import { key } from "../../src/core/types/key.ts";
import type { ExecutionContext } from "../../src/cpu/execution-context.ts";
import { IndexRegister } from "../../src/cpu/index-register/index-register.ts";
import { ProgramCounter } from "../../src/cpu/program-counter/program-counter.ts";
import { registerIndex } from "../../src/cpu/registers/register-index.ts";
import { Registers } from "../../src/cpu/registers/registers.ts";
import { Stack } from "../../src/cpu/stack/stack.ts";
import { DisplayBuffer } from "../../src/display/display-buffer.ts";
import { VerticalBlank } from "../../src/display/vertical-blank.ts";
import { ClassicFont } from "../../src/font/classic-font.ts";
import { KeyboardState } from "../../src/keyboard/keyboard-state.ts";
import { CLASSIC_CHIP8_PROFILE } from "../../src/machine/classic/classic-chip8-profile.ts";
import { SUPERCHIP_PROFILE } from "../../src/machine/superchip/superchip-profile.ts";
import type { Chip8Profile } from "../../src/machine/chip8-profile.ts";
import { MachineInitializer } from "../../src/machine/machine-initializer.ts";
import { MemoryImageLoader } from "../../src/memory/memory-image-loader.ts";
import { MemoryImage } from "../../src/memory/memory-image.ts";
import { Ram } from "../../src/memory/ram.ts";
import { TestRandomNumberGenerator } from "../../src/random/test-random-number-generator.ts";
import { Timer } from "../../src/timer/timer.ts";
import { RplFlags } from "./rpl-flags.ts";
import { ExitState } from "./exit-state.ts";

interface TestMachine {
  readonly context: ExecutionContext;
  readonly keyboard: KeyboardState;
  readonly randomNumberGenerator: TestRandomNumberGenerator;
}

function createMachine(profile: Chip8Profile = CLASSIC_CHIP8_PROFILE): TestMachine {
  const keyboard = new KeyboardState();
  const randomNumberGenerator = new TestRandomNumberGenerator([byte(0x12), byte(0x34)]);

  const context: ExecutionContext = {
    registers: new Registers(),
    memory: new Ram(profile.memorySize),
    stack: new Stack(profile.stackCapacity),
    programCounter: new ProgramCounter(profile.programStartAddress),
    indexRegister: new IndexRegister(),
    soundTimer: new Timer(),
    delayTimer: new Timer(),
    displayBuffer: new DisplayBuffer(profile.display.specification, "clip"),
    verticalBlank: new VerticalBlank(),
    keyboard,
    font: new ClassicFont(profile.fonts.small.baseAddress),
    randomNumberGenerator,
    rplFlags: new RplFlags(),
    exitState: new ExitState(),
  };

  return { context, keyboard, randomNumberGenerator };
}

Deno.test(
  "MachineInitializer resets machine state and installs font and program images",
  () => {
    const profile = CLASSIC_CHIP8_PROFILE;
    const { context, keyboard, randomNumberGenerator } = createMachine(profile);

    context.memory.write(address(0x300), byte(0xaa));
    context.registers.set(registerIndex(0x3), byte(0xbb));
    context.stack.push(address(0x345));
    context.programCounter.setValue(address(0x300));
    context.indexRegister.setValue(address(0x456));
    context.delayTimer.setValue(byte(12));
    context.soundTimer.setValue(byte(34));
    context.displayBuffer.setPixel(2, 3, true);

    const pressedKey = key(0xa);

    keyboard.press(pressedKey);
    assertEquals(keyboard.pollKeyRelease(), undefined);

    assertEquals(randomNumberGenerator.nextByte(), byte(0x12));

    const program = new MemoryImage([0x60, 0x42, 0x70, 0x01]);
    const initializer = new MachineInitializer(new MemoryImageLoader());
    initializer.initialize(context, profile, program);

    assertEquals(context.memory.read(address(0x300)), byte(0));
    assertEquals(context.registers.get(registerIndex(0x3)), byte(0));
    assertEquals(context.stack.isEmpty(), true);
    assertEquals(context.programCounter.getValue(), profile.programStartAddress);
    assertEquals(context.indexRegister.getValue(), address(0));
    assertEquals(context.delayTimer.getValue(), byte(0));
    assertEquals(context.soundTimer.getValue(), byte(0));
    assertEquals(context.displayBuffer.getPixel(2, 3), false);

    /*
     * Resetting the machine discards the old FX0A wait but preserves the
     * physical/current pressed-key state.
     */
    assertEquals(keyboard.isPressed(pressedKey), true);

    keyboard.release(pressedKey);

    assertEquals(keyboard.pollKeyRelease(), undefined);

    /*
     * Initialization does not reset or otherwise consume RNG state.
     */
    assertEquals(randomNumberGenerator.nextByte(), byte(0x34));

    for (const [offset, value] of profile.fonts.small.image.bytes.entries()) {
      assertEquals(
        context.memory.read(address(profile.fonts.small.baseAddress + offset)),
        value,
      );
    }

    for (const [offset, value] of program.bytes.entries()) {
      assertEquals(context.memory.read(address(profile.programStartAddress + offset)), value);
    }
  },
);

Deno.test("MachineInitializer resets interpreter exit state", () => {
  const profile = CLASSIC_CHIP8_PROFILE;
  const { context } = createMachine(profile);

  context.memory.write(address(0x300), byte(0xaa));
  context.registers.set(registerIndex(0x3), byte(0xbb));
  context.stack.push(address(0x345));
  context.programCounter.setValue(address(0x300));
  context.indexRegister.setValue(address(0x456));
  context.delayTimer.setValue(byte(12));
  context.soundTimer.setValue(byte(34));
  context.displayBuffer.setPixel(2, 3, true);
  context.exitState.exit();

  assertEquals(context.exitState.isExited, true);

  const program = new MemoryImage([0x60, 0x42, 0x70, 0x01]);
  const initializer = new MachineInitializer(new MemoryImageLoader());
  initializer.initialize(context, profile, program);

  assertEquals(context.exitState.isExited, false);
});

Deno.test("MachineInitializer rejects an oversized program before mutating the machine", () => {
  const profile = CLASSIC_CHIP8_PROFILE;
  const { context } = createMachine(profile);

  context.memory.write(address(0x300), byte(0xaa));
  context.registers.set(registerIndex(0x3), byte(0xbb));
  context.programCounter.setValue(address(0x300));

  const availableProgramBytes = profile.memorySize - profile.programStartAddress;

  const program = new MemoryImage(new Array(availableProgramBytes + 1).fill(0));

  const initializer = new MachineInitializer(new MemoryImageLoader());

  assertThrows(() => initializer.initialize(context, profile, program), RangeError);

  assertEquals(context.memory.read(address(0x300)), byte(0xaa));
  assertEquals(context.registers.get(registerIndex(0x3)), byte(0xbb));
  assertEquals(context.programCounter.getValue(), address(0x300));
});

Deno.test(
  "MachineInitializer rejects a font image that does not fit before mutating the machine",
  () => {
    const profile: Chip8Profile = {
      ...CLASSIC_CHIP8_PROFILE,
      fonts: {
        ...CLASSIC_CHIP8_PROFILE.fonts,
        small: {
          ...CLASSIC_CHIP8_PROFILE.fonts.small,
          baseAddress: address(
            CLASSIC_CHIP8_PROFILE.memorySize -
              CLASSIC_CHIP8_PROFILE.fonts.small.image.bytes.length +
              1,
          ),
        },
      },
    };

    const { context } = createMachine(profile);

    context.memory.write(address(0x300), byte(0xaa));
    context.registers.set(registerIndex(0x3), byte(0xbb));

    const program = new MemoryImage([0x60, 0x42]);

    const initializer = new MachineInitializer(new MemoryImageLoader());

    assertThrows(() => initializer.initialize(context, profile, program), RangeError);

    assertEquals(context.memory.read(address(0x300)), byte(0xaa));
    assertEquals(context.registers.get(registerIndex(0x3)), byte(0xbb));
  },
);

Deno.test(
  "MachineInitializer rejects font and program overlap before mutating the machine",
  () => {
    const profile: Chip8Profile = {
      ...CLASSIC_CHIP8_PROFILE,
      fonts: {
        small: {
          baseAddress: address(0x1f0),
          image: CLASSIC_CHIP8_PROFILE.fonts.small.image,
        },
        large: null,
      },
    };

    const { context } = createMachine(profile);

    context.memory.write(address(0x300), byte(0xaa));
    context.registers.set(registerIndex(0x3), byte(0xbb));

    const program = new MemoryImage([0x60, 0x42]);

    const initializer = new MachineInitializer(new MemoryImageLoader());

    assertThrows(() => initializer.initialize(context, profile, program), RangeError);

    assertEquals(context.memory.read(address(0x300)), byte(0xaa));
    assertEquals(context.registers.get(registerIndex(0x3)), byte(0xbb));
  },
);

Deno.test(
  "MachineInitializer rejects memory that does not match the profile before mutation",
  () => {
    const profile = CLASSIC_CHIP8_PROFILE;

    const context: ExecutionContext = {
      ...createMachine(profile).context,
      memory: new Ram(profile.memorySize - 1),
    };

    context.memory.write(address(0x300), byte(0xaa));

    const initializer = new MachineInitializer(new MemoryImageLoader());

    const program = new MemoryImage([0x60, 0x42]);

    assertThrows(() => initializer.initialize(context, profile, program), RangeError);

    assertEquals(context.memory.read(address(0x300)), byte(0xaa));
  },
);

Deno.test("MachineInitializer rejects an empty font image before mutating the machine", () => {
  const profile: Chip8Profile = {
    ...CLASSIC_CHIP8_PROFILE,
    fonts: {
      ...CLASSIC_CHIP8_PROFILE.fonts,
      small: {
        ...CLASSIC_CHIP8_PROFILE.fonts.small,
        image: new MemoryImage([]),
      },
    },
  };

  const { context } = createMachine(profile);

  context.memory.write(address(0x300), byte(0xaa));
  context.registers.set(registerIndex(0x3), byte(0xbb));

  const program = new MemoryImage([0x60, 0x42]);

  const initializer = new MachineInitializer(new MemoryImageLoader());

  assertThrows(
    () => initializer.initialize(context, profile, program),
    RangeError,
    "Font image must not be empty.",
  );

  assertEquals(context.memory.read(address(0x300)), byte(0xaa));

  assertEquals(context.registers.get(registerIndex(0x3)), byte(0xbb));
});

Deno.test(
  "MachineInitializer rejects an empty program image before mutating the machine",
  () => {
    const profile = CLASSIC_CHIP8_PROFILE;
    const { context } = createMachine(profile);

    context.memory.write(address(0x300), byte(0xaa));
    context.registers.set(registerIndex(0x3), byte(0xbb));

    const program = new MemoryImage([]);

    const initializer = new MachineInitializer(new MemoryImageLoader());

    assertThrows(
      () => initializer.initialize(context, profile, program),
      RangeError,
      "Program image must not be empty.",
    );

    assertEquals(context.memory.read(address(0x300)), byte(0xaa));

    assertEquals(context.registers.get(registerIndex(0x3)), byte(0xbb));
  },
);

Deno.test("MachineInitializer clears pending vertical blank state", () => {
  // const { context, initializer, profile, program } = createHarness();

  const profile = CLASSIC_CHIP8_PROFILE;
  const { context } = createMachine(profile);
  const initializer = new MachineInitializer(new MemoryImageLoader());
  const program = new MemoryImage([0x60, 0x42]);

  context.verticalBlank.signal();

  assertEquals(context.verticalBlank.consume(), true);

  context.verticalBlank.signal();

  initializer.initialize(context, profile, program);

  assertEquals(context.verticalBlank.consume(), false);
});

Deno.test("MachineInitializer restores SUPER-CHIP display to its initial mode", () => {
  const profile: Chip8Profile = {
    ...CLASSIC_CHIP8_PROFILE,

    display: {
      ...CLASSIC_CHIP8_PROFILE.display,

      specification: {
        kind: "superchip",
        backingWidth: 128,
        backingHeight: 64,
        initialMode: "low",
      },
    },
  };

  const { context } = createMachine(profile);

  const initializer = new MachineInitializer(new MemoryImageLoader());
  const program = new MemoryImage([0x60, 0x42]);

  context.displayBuffer.setMode("high");
  context.displayBuffer.setPixel(100, 50, true);

  assertEquals(context.displayBuffer.width, 128);
  assertEquals(context.displayBuffer.height, 64);
  assertEquals(context.displayBuffer.getPixel(100, 50), true);

  initializer.initialize(context, profile, program);

  assertEquals(context.displayBuffer.width, 64);
  assertEquals(context.displayBuffer.height, 32);
  assertEquals(context.displayBuffer.getPixel(100, 50), false);
});

Deno.test("MachineInitializer installs the optional large font image", () => {
  const profile = SUPERCHIP_PROFILE;
  const { context } = createMachine(profile);

  const program = new MemoryImage([0x60, 0x42]);

  const initializer = new MachineInitializer(new MemoryImageLoader());

  initializer.initialize(context, profile, program);

  const largeFont = profile.fonts.large;

  if (largeFont === null) {
    throw new Error("SUPER-CHIP profile must provide a large font.");
  }

  for (const [offset, value] of largeFont.image.bytes.entries()) {
    assertEquals(context.memory.read(address(largeFont.baseAddress + offset)), value);
  }
});

Deno.test(
  "MachineInitializer rejects overlapping small and large font images before mutation",
  () => {
    const largeFont = SUPERCHIP_PROFILE.fonts.large;

    if (largeFont === null) {
      throw new Error("SUPER-CHIP profile must provide a large font.");
    }

    const profile: Chip8Profile = {
      ...SUPERCHIP_PROFILE,
      fonts: {
        ...SUPERCHIP_PROFILE.fonts,
        large: {
          ...largeFont,
          baseAddress: SUPERCHIP_PROFILE.fonts.small.baseAddress,
        },
      },
    };

    const { context } = createMachine(profile);

    context.memory.write(address(0x300), byte(0xaa));

    const program = new MemoryImage([0x60, 0x42]);

    const initializer = new MachineInitializer(new MemoryImageLoader());

    assertThrows(
      () => initializer.initialize(context, profile, program),
      RangeError,
      "Large font image overlaps the font image.",
    );

    assertEquals(context.memory.read(address(0x300)), byte(0xaa));
  },
);

Deno.test("initialization preserves RPL flags", () => {
  const profile = SUPERCHIP_PROFILE;

  const { context } = createMachine(profile);

  context.rplFlags.set(registerIndex(3), byte(0x42));

  const program = new MemoryImage([0x60, 0x42]);

  const initializer = new MachineInitializer(new MemoryImageLoader());

  initializer.initialize(context, profile, program);

  initializer.initialize(context, SUPERCHIP_PROFILE, new MemoryImage([0x00, 0xe0]));

  assertEquals(context.rplFlags.get(registerIndex(3)), byte(0x42));
});
