import { assertEquals, assertThrows } from "@std/assert";

import { address } from "../core/types/address.ts";
import { type Byte, byte } from "../core/types/byte.ts";
import { opcode } from "../core/types/opcode.ts";
import type { Chip8Quirks } from "../machine/chip8-profile.ts";
import { key } from "../core/types/key.ts";
import { DisplayBuffer } from "../display/display-buffer.ts";
import { VerticalBlank } from "../display/vertical-blank.ts";
import { ClassicFont } from "../font/classic-font.ts";
import { SuperChipFont } from "../font/superchip-font.ts";
import type { Font } from "../font/font.ts";
import type { Instruction } from "../instruction/instruction.ts";
import { Ram } from "../memory/ram.ts";
import { Timer } from "../timer/timer.ts";
import { IndexRegister } from "./index-register/index-register.ts";
import type { ExecutionContext } from "./execution-context.ts";
import {
  FLAG_REGISTER,
  InstructionExecutor,
  UnsupportedInstructionError,
} from "./instruction-executor.ts";
import { ProgramCounter } from "./program-counter/program-counter.ts";
import { registerIndex } from "./registers/register-index.ts";
import { Registers } from "./registers/registers.ts";
import { Stack } from "./stack/stack.ts";
import { TestRandomNumberGenerator } from "../random/test-random-number-generator.ts";
import { KeyboardState } from "../keyboard/keyboard-state.ts";
import { RplFlags } from "../machine/rpl-flags.ts";
import { ExitState } from "../machine/exit-state.ts";

import { CLASSIC_CHIP8_PROFILE } from "../machine/classic/classic-chip8-profile.ts";
import { CHIP48_PROFILE } from "../machine/chip48/chip48-profile.ts";
import { SUPERCHIP_PROFILE } from "../machine/superchip/superchip-profile.ts";
import type { Chip8InstructionSet } from "../machine/chip8-profile.ts";

function createContext(overrides: Partial<ExecutionContext> = {}): ExecutionContext {
  const profile = CLASSIC_CHIP8_PROFILE;

  return {
    registers: new Registers(),
    memory: new Ram(profile.memorySize),
    stack: new Stack(profile.stackCapacity),
    programCounter: new ProgramCounter(profile.programStartAddress),
    indexRegister: new IndexRegister(),
    soundTimer: new Timer(),
    delayTimer: new Timer(),
    displayBuffer: new DisplayBuffer(profile.display.specification, "clip"),
    verticalBlank: new VerticalBlank(),
    keyboard: new KeyboardState(),
    font: new ClassicFont(profile.fontBaseAddress),
    randomNumberGenerator: new TestRandomNumberGenerator([byte(0)]),
    ...overrides,

    exitState: overrides.exitState ?? new ExitState(),
    rplFlags: overrides.rplFlags ?? new RplFlags(),
  };
}

function createExecutor(
  compatibility: Chip8Quirks = CLASSIC_CHIP8_PROFILE.quirks,
  instructionSet: Chip8InstructionSet = CLASSIC_CHIP8_PROFILE.instructionSet,
): InstructionExecutor {
  return new InstructionExecutor(instructionSet, compatibility);
}

function createFixedDisplayBuffer(width: number, height: number): DisplayBuffer {
  return new DisplayBuffer(
    {
      kind: "fixed",
      width,
      height,
    },
    "clip",
  );
}

function registerOperation(
  operation: Extract<Instruction, { kind: "register-operation" }>["operation"],
  x: number,
  y: number,
  value: number,
): Extract<Instruction, { kind: "register-operation" }> {
  return {
    kind: "register-operation",
    opcode: opcode(value),
    operation,
    x: registerIndex(x),
    y: registerIndex(y),
  };
}

Deno.test("CLS clears the display buffer", () => {
  const displayBuffer = createFixedDisplayBuffer(64, 32);
  displayBuffer.setPixel(10, 20, true);

  const context = createContext({ displayBuffer });
  const executor = createExecutor();

  executor.execute(
    {
      kind: "clear-screen",
      opcode: opcode(0x00e0),
    },
    context,
  );

  assertEquals(displayBuffer.getPixel(10, 20), false);
});

Deno.test("JP sets the program counter to its target address", () => {
  const programCounter = new ProgramCounter(address(0x202));
  const context = createContext({ programCounter });
  const executor = createExecutor();

  executor.execute(
    {
      kind: "jump",
      opcode: opcode(0x1234),
      address: address(0x234),
    },
    context,
  );

  assertEquals(programCounter.getValue(), address(0x234));
});

Deno.test("CALL pushes the current program counter and jumps", () => {
  const programCounter = new ProgramCounter(address(0x202));
  const stack = new Stack(CLASSIC_CHIP8_PROFILE.stackCapacity);
  const context = createContext({ programCounter, stack });
  const executor = createExecutor();

  executor.execute(
    {
      kind: "call",
      opcode: opcode(0x2300),
      address: address(0x300),
    },
    context,
  );

  assertEquals(programCounter.getValue(), address(0x300));
  assertEquals(stack.pop(), address(0x202));
});

Deno.test("RET pops the return address into the program counter", () => {
  const programCounter = new ProgramCounter(address(0x300));
  const stack = new Stack(CLASSIC_CHIP8_PROFILE.stackCapacity);
  stack.push(address(0x202));

  const context = createContext({ programCounter, stack });
  const executor = createExecutor();

  executor.execute(
    {
      kind: "return",
      opcode: opcode(0x00ee),
    },
    context,
  );

  assertEquals(programCounter.getValue(), address(0x202));
  assertEquals(stack.isEmpty(), true);
});

Deno.test("SE Vx, NN skips when the values are equal", () => {
  const registers = new Registers();
  const programCounter = new ProgramCounter(address(0x202));
  registers.set(registerIndex(0xa), byte(0x42));

  const context = createContext({ registers, programCounter });
  const executor = createExecutor();

  executor.execute(
    {
      kind: "skip-equal-immediate",
      opcode: opcode(0x3a42),
      register: registerIndex(0xa),
      value: byte(0x42),
    },
    context,
  );

  assertEquals(programCounter.getValue(), address(0x204));
});

Deno.test("SE Vx, NN does not skip when the values differ", () => {
  const registers = new Registers();
  const programCounter = new ProgramCounter(address(0x202));
  registers.set(registerIndex(0xa), byte(0x41));

  const context = createContext({ registers, programCounter });
  const executor = createExecutor();

  executor.execute(
    {
      kind: "skip-equal-immediate",
      opcode: opcode(0x3a42),
      register: registerIndex(0xa),
      value: byte(0x42),
    },
    context,
  );

  assertEquals(programCounter.getValue(), address(0x202));
});

Deno.test("SNE Vx, NN skips when the values differ", () => {
  const registers = new Registers();
  const programCounter = new ProgramCounter(address(0x202));
  registers.set(registerIndex(0xa), byte(0x41));

  const context = createContext({ registers, programCounter });
  const executor = createExecutor();

  executor.execute(
    {
      kind: "skip-not-equal-immediate",
      opcode: opcode(0x4a42),
      register: registerIndex(0xa),
      value: byte(0x42),
    },
    context,
  );

  assertEquals(programCounter.getValue(), address(0x204));
});

Deno.test("SE Vx, Vy skips when the registers are equal", () => {
  const registers = new Registers();
  const programCounter = new ProgramCounter(address(0x202));
  registers.set(registerIndex(0xa), byte(0x42));
  registers.set(registerIndex(0xb), byte(0x42));

  const context = createContext({ registers, programCounter });
  const executor = createExecutor();

  executor.execute(
    {
      kind: "skip-equal-register",
      opcode: opcode(0x5ab0),
      x: registerIndex(0xa),
      y: registerIndex(0xb),
    },
    context,
  );

  assertEquals(programCounter.getValue(), address(0x204));
});

Deno.test("SNE Vx, Vy skips when the registers differ", () => {
  const registers = new Registers();
  const programCounter = new ProgramCounter(address(0x202));
  registers.set(registerIndex(0xa), byte(0x42));
  registers.set(registerIndex(0xb), byte(0x43));

  const context = createContext({ registers, programCounter });
  const executor = createExecutor();

  executor.execute(
    {
      kind: "skip-not-equal-register",
      opcode: opcode(0x9ab0),
      x: registerIndex(0xa),
      y: registerIndex(0xb),
    },
    context,
  );

  assertEquals(programCounter.getValue(), address(0x204));
});

Deno.test("LD Vx, NN stores the immediate value", () => {
  const registers = new Registers();
  const context = createContext({ registers });
  const executor = createExecutor();

  executor.execute(
    {
      kind: "load-immediate",
      opcode: opcode(0x6a42),
      register: registerIndex(0xa),
      value: byte(0x42),
    },
    context,
  );

  assertEquals(registers.get(registerIndex(0xa)), byte(0x42));
});

Deno.test("ADD Vx, NN wraps at 0xFF without changing VF", () => {
  const registers = new Registers();
  registers.set(registerIndex(0xa), byte(0xff));
  registers.set(FLAG_REGISTER, byte(0x7f));

  const context = createContext({ registers });
  const executor = createExecutor();

  executor.execute(
    {
      kind: "add-immediate",
      opcode: opcode(0x7aff),
      register: registerIndex(0xa),
      value: byte(0xff),
    },
    context,
  );

  assertEquals(registers.get(registerIndex(0xa)), byte(0xfe));
  assertEquals(registers.get(FLAG_REGISTER), byte(0x7f));
});

Deno.test("LD Vx, Vy copies the source register", () => {
  const registers = new Registers();
  registers.set(registerIndex(0xa), byte(0x12));
  registers.set(registerIndex(0xb), byte(0xab));

  const context = createContext({ registers });
  const executor = createExecutor();

  executor.execute(registerOperation("assign", 0xa, 0xb, 0x8ab0), context);

  assertEquals(registers.get(registerIndex(0xa)), byte(0xab));
});

Deno.test("OR Vx, Vy performs a bitwise OR and clears VF", () => {
  const registers = new Registers();

  registers.set(registerIndex(0xa), byte(0b1010_0000));
  registers.set(registerIndex(0xb), byte(0b0000_1111));
  registers.set(FLAG_REGISTER, byte(0xff));

  const context = createContext({ registers });
  const executor = createExecutor();

  executor.execute(registerOperation("or", 0xa, 0xb, 0x8ab1), context);

  assertEquals(registers.get(registerIndex(0xa)), byte(0b1010_1111));
  assertEquals(registers.get(FLAG_REGISTER), byte(0));
});

Deno.test("OR Vx, Vy leaves VF unchanged when configured", () => {
  const registers = new Registers();

  registers.set(registerIndex(0xa), byte(0b1010_0000));

  registers.set(registerIndex(0xb), byte(0b0000_1111));

  registers.set(FLAG_REGISTER, byte(0x7f));

  const context = createContext({
    registers,
  });

  const executor = createExecutor({
    ...CLASSIC_CHIP8_PROFILE.quirks,
    logicFlag: "unchanged",
  });

  executor.execute(registerOperation("or", 0xa, 0xb, 0x8ab1), context);

  assertEquals(registers.get(registerIndex(0xa)), byte(0b1010_1111));

  assertEquals(registers.get(FLAG_REGISTER), byte(0x7f));
});

Deno.test("AND Vx, Vy performs a bitwise AND and clears VF", () => {
  const registers = new Registers();

  registers.set(registerIndex(0xa), byte(0b1010_1010));
  registers.set(registerIndex(0xb), byte(0b1111_0000));
  registers.set(FLAG_REGISTER, byte(0xff));

  const context = createContext({ registers });
  const executor = createExecutor();

  executor.execute(registerOperation("and", 0xa, 0xb, 0x8ab2), context);

  assertEquals(registers.get(registerIndex(0xa)), byte(0b1010_0000));
  assertEquals(registers.get(FLAG_REGISTER), byte(0));
});

Deno.test("AND Vx, Vy leaves VF unchanged when configured", () => {
  const registers = new Registers();

  registers.set(registerIndex(0xa), byte(0b1010_1010));

  registers.set(registerIndex(0xb), byte(0b1111_0000));

  registers.set(FLAG_REGISTER, byte(0x7f));

  const context = createContext({
    registers,
  });

  const executor = createExecutor({
    ...CLASSIC_CHIP8_PROFILE.quirks,
    logicFlag: "unchanged",
  });

  executor.execute(registerOperation("and", 0xa, 0xb, 0x8ab2), context);

  assertEquals(registers.get(registerIndex(0xa)), byte(0b1010_0000));

  assertEquals(registers.get(FLAG_REGISTER), byte(0x7f));
});

Deno.test("XOR Vx, Vy performs a bitwise XOR and clears VF", () => {
  const registers = new Registers();

  registers.set(registerIndex(0xa), byte(0b1010_1010));
  registers.set(registerIndex(0xb), byte(0b1111_0000));
  registers.set(FLAG_REGISTER, byte(0xff));

  const context = createContext({ registers });
  const executor = createExecutor();

  executor.execute(registerOperation("xor", 0xa, 0xb, 0x8ab3), context);

  assertEquals(registers.get(registerIndex(0xa)), byte(0b0101_1010));
  assertEquals(registers.get(FLAG_REGISTER), byte(0));
});

Deno.test("XOR Vx, Vy leaves VF unchanged when configured", () => {
  const registers = new Registers();

  registers.set(registerIndex(0xa), byte(0b1010_1010));

  registers.set(registerIndex(0xb), byte(0b1111_0000));

  registers.set(FLAG_REGISTER, byte(0x7f));

  const context = createContext({
    registers,
  });

  const executor = createExecutor({
    ...CLASSIC_CHIP8_PROFILE.quirks,
    logicFlag: "unchanged",
  });

  executor.execute(registerOperation("xor", 0xa, 0xb, 0x8ab3), context);

  assertEquals(registers.get(registerIndex(0xa)), byte(0b0101_1010));

  assertEquals(registers.get(FLAG_REGISTER), byte(0x7f));
});
Deno.test("ADD Vx, Vy stores the wrapped result and carry in VF", () => {
  const registers = new Registers();
  registers.set(registerIndex(0xa), byte(0xff));
  registers.set(registerIndex(0xb), byte(0x01));

  const context = createContext({ registers });
  const executor = createExecutor();

  executor.execute(registerOperation("add", 0xa, 0xb, 0x8ab4), context);

  assertEquals(registers.get(registerIndex(0xa)), byte(0x00));
  assertEquals(registers.get(FLAG_REGISTER), byte(0x01));
});

Deno.test("ADD Vx, Vy clears VF when there is no carry", () => {
  const registers = new Registers();
  registers.set(registerIndex(0xa), byte(0x12));
  registers.set(registerIndex(0xb), byte(0x34));
  registers.set(FLAG_REGISTER, byte(0xff));

  const context = createContext({ registers });
  const executor = createExecutor();

  executor.execute(registerOperation("add", 0xa, 0xb, 0x8ab4), context);

  assertEquals(registers.get(registerIndex(0xa)), byte(0x46));
  assertEquals(registers.get(FLAG_REGISTER), byte(0x00));
});

Deno.test("SUB Vx, Vy stores the result and sets VF when no borrow occurs", () => {
  const registers = new Registers();
  registers.set(registerIndex(0xa), byte(0x05));
  registers.set(registerIndex(0xb), byte(0x03));

  const context = createContext({ registers });
  const executor = createExecutor();

  executor.execute(registerOperation("subtract", 0xa, 0xb, 0x8ab5), context);

  assertEquals(registers.get(registerIndex(0xa)), byte(0x02));
  assertEquals(registers.get(FLAG_REGISTER), byte(0x01));
});

Deno.test("SUB Vx, Vy wraps and clears VF when a borrow occurs", () => {
  const registers = new Registers();
  registers.set(registerIndex(0xa), byte(0x03));
  registers.set(registerIndex(0xb), byte(0x05));

  const context = createContext({ registers });
  const executor = createExecutor();

  executor.execute(registerOperation("subtract", 0xa, 0xb, 0x8ab5), context);

  assertEquals(registers.get(registerIndex(0xa)), byte(0xfe));
  assertEquals(registers.get(FLAG_REGISTER), byte(0x00));
});

Deno.test("SHR Vx, Vy shifts Vy right into Vx and stores its old LSB in VF", () => {
  const registers = new Registers();

  registers.set(registerIndex(0xa), byte(0b1111_0000));
  registers.set(registerIndex(0xb), byte(0b0000_0011));

  const context = createContext({ registers });
  const executor = createExecutor();

  executor.execute(registerOperation("shift-right", 0xa, 0xb, 0x8ab6), context);

  assertEquals(registers.get(registerIndex(0xa)), byte(0b0000_0001));
  assertEquals(registers.get(registerIndex(0xb)), byte(0b0000_0011));
  assertEquals(registers.get(FLAG_REGISTER), byte(1));
});

Deno.test("SHR uses Vx as the source when configured for vx shifts", () => {
  const registers = new Registers();

  registers.set(registerIndex(0xa), byte(0b1111_0011));

  registers.set(registerIndex(0xb), byte(0b0000_0100));

  const context = createContext({
    registers,
  });

  const executor = createExecutor({
    ...CLASSIC_CHIP8_PROFILE.quirks,
    shiftSource: "vx",
  });

  executor.execute(registerOperation("shift-right", 0xa, 0xb, 0x8ab6), context);

  assertEquals(registers.get(registerIndex(0xa)), byte(0b0111_1001));

  assertEquals(registers.get(registerIndex(0xb)), byte(0b0000_0100));

  assertEquals(registers.get(FLAG_REGISTER), byte(1));
});

Deno.test("SHR reads VF before updating it when VF is Vy", () => {
  const registers = new Registers();

  registers.set(registerIndex(0xa), byte(0xff));
  registers.set(FLAG_REGISTER, byte(0b0000_0011));

  const context = createContext({ registers });
  const executor = createExecutor();

  executor.execute(registerOperation("shift-right", 0xa, 0xf, 0x8af6), context);

  assertEquals(registers.get(registerIndex(0xa)), byte(0b0000_0001));
  assertEquals(registers.get(FLAG_REGISTER), byte(1));
});

Deno.test("SUBN Vx, Vy computes Vy minus Vx", () => {
  const registers = new Registers();
  registers.set(registerIndex(0xa), byte(0x03));
  registers.set(registerIndex(0xb), byte(0x05));

  const context = createContext({ registers });
  const executor = createExecutor();

  executor.execute(registerOperation("reverse-subtract", 0xa, 0xb, 0x8ab7), context);

  assertEquals(registers.get(registerIndex(0xa)), byte(0x02));
  assertEquals(registers.get(FLAG_REGISTER), byte(0x01));
});

Deno.test("SUBN Vx, Vy computes Vy minus Vx and wraps when a borrow occurs", () => {
  const registers = new Registers();
  registers.set(registerIndex(0xa), byte(0x05));
  registers.set(registerIndex(0xb), byte(0x03));

  const context = createContext({ registers });
  const executor = createExecutor();
  executor.execute(registerOperation("reverse-subtract", 0xa, 0xb, 0x8ab7), context);

  assertEquals(registers.get(registerIndex(0xa)), byte(0xfe));
  assertEquals(registers.get(FLAG_REGISTER), byte(0x00));
});

Deno.test("SHL Vx, Vy shifts Vy left into Vx and stores its old MSB in VF", () => {
  const registers = new Registers();

  registers.set(registerIndex(0xa), byte(0b0000_1111));
  registers.set(registerIndex(0xb), byte(0b1000_0001));

  const context = createContext({ registers });
  const executor = createExecutor();

  executor.execute(registerOperation("shift-left", 0xa, 0xb, 0x8abe), context);

  assertEquals(registers.get(registerIndex(0xa)), byte(0b0000_0010));
  assertEquals(registers.get(registerIndex(0xb)), byte(0b1000_0001));
  assertEquals(registers.get(FLAG_REGISTER), byte(1));
});

Deno.test("SHL uses Vx as the source when configured for vx shifts", () => {
  const registers = new Registers();

  registers.set(registerIndex(0xa), byte(0b1000_0011));

  registers.set(registerIndex(0xb), byte(0b0000_0100));

  const context = createContext({
    registers,
  });

  const executor = createExecutor({
    ...CLASSIC_CHIP8_PROFILE.quirks,
    shiftSource: "vx",
  });

  executor.execute(registerOperation("shift-left", 0xa, 0xb, 0x8abe), context);

  assertEquals(registers.get(registerIndex(0xa)), byte(0b0000_0110));

  assertEquals(registers.get(registerIndex(0xb)), byte(0b0000_0100));

  assertEquals(registers.get(FLAG_REGISTER), byte(1));
});

Deno.test("SHL writes VF last when VF is Vx", () => {
  const registers = new Registers();

  registers.set(FLAG_REGISTER, byte(0));
  registers.set(registerIndex(0xa), byte(0b1000_0001));

  const context = createContext({ registers });
  const executor = createExecutor();

  executor.execute(registerOperation("shift-left", 0xf, 0xa, 0x8fae), context);

  assertEquals(registers.get(FLAG_REGISTER), byte(1));
});

Deno.test("logical register operations read VF before clearing it when VF is Vy", () => {
  const registers = new Registers();

  registers.set(registerIndex(0xa), byte(0b0000_1111));
  registers.set(FLAG_REGISTER, byte(0b1111_0000));

  const context = createContext({ registers });
  const executor = createExecutor();

  executor.execute(registerOperation("or", 0xa, 0xf, 0x8af1), context);

  assertEquals(registers.get(registerIndex(0xa)), byte(0b1111_1111));
  assertEquals(registers.get(FLAG_REGISTER), byte(0));
});

Deno.test("logical register operations clear VF last when VF is Vx", () => {
  const registers = new Registers();

  registers.set(FLAG_REGISTER, byte(0b1111_0000));
  registers.set(registerIndex(0xa), byte(0b0000_1111));

  const context = createContext({ registers });
  const executor = createExecutor();

  executor.execute(registerOperation("or", 0xf, 0xa, 0x8fa1), context);

  assertEquals(registers.get(FLAG_REGISTER), byte(0));
});

Deno.test("0NNN native system calls throw UnsupportedInstructionError", () => {
  const context = createContext();
  const executor = createExecutor();

  const instruction: Instruction = {
    kind: "system-call",
    opcode: opcode(0x0123),
    address: address(0x123),
  };

  const error = assertThrows(
    () => executor.execute(instruction, context),
    UnsupportedInstructionError,
  );

  assertEquals(error.instruction, instruction);
});

Deno.test("DRW draws the sprite stored at I", () => {
  const registers = new Registers();
  registers.set(registerIndex(0xa), byte(0x02));
  registers.set(registerIndex(0xb), byte(0x03));

  const memory = new Ram(0x1000);
  memory.write(address(0x300), byte(0b1010_0000));

  const indexRegister = new IndexRegister(address(0x300));
  const displayBuffer = createFixedDisplayBuffer(8, 8);

  const verticalBlank = new VerticalBlank();

  verticalBlank.signal();

  const context = createContext({
    registers,
    memory,
    indexRegister,
    displayBuffer,
    verticalBlank,
  });

  const executor = createExecutor();

  executor.execute(
    {
      kind: "draw-sprite",
      opcode: opcode(0xdab1),
      x: registerIndex(0xa),
      y: registerIndex(0xb),
      height: 1,
    },
    context,
  );

  assertEquals(displayBuffer.getPixel(2, 3), true);
  assertEquals(displayBuffer.getPixel(3, 3), false);
  assertEquals(displayBuffer.getPixel(4, 3), true);
  assertEquals(registers.get(FLAG_REGISTER), byte(0));
});

Deno.test("DRW sets VF when a sprite pixel collides", () => {
  const registers = new Registers();
  registers.set(registerIndex(0xa), byte(0x00));
  registers.set(registerIndex(0xb), byte(0x00));

  const memory = new Ram(0x1000);
  memory.write(address(0x300), byte(0b1000_0000));

  const indexRegister = new IndexRegister(address(0x300));
  const displayBuffer = createFixedDisplayBuffer(8, 8);

  const verticalBlank = new VerticalBlank();

  verticalBlank.signal();

  displayBuffer.setPixel(0, 0, true);

  const context = createContext({
    registers,
    memory,
    indexRegister,
    displayBuffer,
    verticalBlank,
  });

  const executor = createExecutor();

  executor.execute(
    {
      kind: "draw-sprite",
      opcode: opcode(0xdab1),
      x: registerIndex(0xa),
      y: registerIndex(0xb),
      height: 1,
    },
    context,
  );

  assertEquals(displayBuffer.getPixel(0, 0), false);
  assertEquals(registers.get(FLAG_REGISTER), byte(1));
});

Deno.test("DRW clears VF when no collision occurs", () => {
  const registers = new Registers();
  registers.set(registerIndex(0xa), byte(0x00));
  registers.set(registerIndex(0xb), byte(0x00));
  registers.set(FLAG_REGISTER, byte(1));

  const memory = new Ram(0x1000);
  memory.write(address(0x300), byte(0b1000_0000));

  const indexRegister = new IndexRegister(address(0x300));
  const displayBuffer = createFixedDisplayBuffer(8, 8);

  const verticalBlank = new VerticalBlank();

  verticalBlank.signal();

  const context = createContext({
    registers,
    memory,
    indexRegister,
    displayBuffer,
    verticalBlank,
  });

  const executor = createExecutor();

  executor.execute(
    {
      kind: "draw-sprite",
      opcode: opcode(0xdab1),
      x: registerIndex(0xa),
      y: registerIndex(0xb),
      height: 1,
    },
    context,
  );

  assertEquals(registers.get(FLAG_REGISTER), byte(0));
});

Deno.test("DRW waits for vertical blank before drawing", () => {
  const registers = new Registers();

  registers.set(registerIndex(0xa), byte(0x02));
  registers.set(registerIndex(0xb), byte(0x03));
  registers.set(FLAG_REGISTER, byte(1));

  const memory = new Ram(0x1000);

  memory.write(address(0x300), byte(0b1000_0000));

  const indexRegister = new IndexRegister(address(0x300));
  const displayBuffer = createFixedDisplayBuffer(8, 8);
  const programCounter = new ProgramCounter(address(0x202));
  const verticalBlank = new VerticalBlank();

  const context = createContext({
    registers,
    memory,
    indexRegister,
    displayBuffer,
    programCounter,
    verticalBlank,
  });

  const executor = createExecutor();

  executor.execute(
    {
      kind: "draw-sprite",
      opcode: opcode(0xdab1),
      x: registerIndex(0xa),
      y: registerIndex(0xb),
      height: 1,
    },
    context,
  );

  assertEquals(programCounter.getValue(), address(0x200));

  assertEquals(displayBuffer.getPixel(2, 3), false);

  assertEquals(registers.get(FLAG_REGISTER), byte(1));
});

Deno.test("DRW draws without vertical blank when configured for immediate drawing", () => {
  const registers = new Registers();

  registers.set(registerIndex(0xa), byte(0x02));

  registers.set(registerIndex(0xb), byte(0x03));

  registers.set(FLAG_REGISTER, byte(1));

  const memory = new Ram(0x1000);

  memory.write(address(0x300), byte(0b1000_0000));

  const indexRegister = new IndexRegister(address(0x300));

  const displayBuffer = createFixedDisplayBuffer(8, 8);

  const programCounter = new ProgramCounter(address(0x202));

  const verticalBlank = new VerticalBlank();

  const context = createContext({
    registers,
    memory,
    indexRegister,
    displayBuffer,
    programCounter,
    verticalBlank,
  });

  const executor = createExecutor({
    ...CLASSIC_CHIP8_PROFILE.quirks,
    spriteDrawTiming: {
      kind: "uniform",
      timing: "immediate",
    },
  });

  executor.execute(
    {
      kind: "draw-sprite",
      opcode: opcode(0xdab1),
      x: registerIndex(0xa),
      y: registerIndex(0xb),
      height: 1,
    },
    context,
  );

  assertEquals(programCounter.getValue(), address(0x202));

  assertEquals(displayBuffer.getPixel(2, 3), true);

  assertEquals(registers.get(FLAG_REGISTER), byte(0));

  assertEquals(verticalBlank.consume(), false);
});

Deno.test("DRW does not consume vertical blank when configured for immediate drawing", () => {
  const registers = new Registers();

  registers.set(registerIndex(0xa), byte(0));

  registers.set(registerIndex(0xb), byte(0));

  const memory = new Ram(0x1000);

  memory.write(address(0x300), byte(0b1000_0000));

  const indexRegister = new IndexRegister(address(0x300));

  const displayBuffer = createFixedDisplayBuffer(8, 8);

  const verticalBlank = new VerticalBlank();

  verticalBlank.signal();

  const context = createContext({
    registers,
    memory,
    indexRegister,
    displayBuffer,
    verticalBlank,
  });

  const executor = createExecutor({
    ...CLASSIC_CHIP8_PROFILE.quirks,
    spriteDrawTiming: {
      kind: "uniform",
      timing: "immediate",
    },
  });

  executor.execute(
    {
      kind: "draw-sprite",
      opcode: opcode(0xdab1),
      x: registerIndex(0xa),
      y: registerIndex(0xb),
      height: 1,
    },
    context,
  );

  assertEquals(displayBuffer.getPixel(0, 0), true);

  assertEquals(verticalBlank.consume(), true);
});

Deno.test("DRW completes after vertical blank becomes available", () => {
  const registers = new Registers();

  registers.set(registerIndex(0xa), byte(0));
  registers.set(registerIndex(0xb), byte(0));

  const memory = new Ram(0x1000);

  memory.write(address(0x300), byte(0b1000_0000));

  const indexRegister = new IndexRegister(address(0x300));
  const displayBuffer = createFixedDisplayBuffer(8, 8);
  const programCounter = new ProgramCounter(address(0x202));
  const verticalBlank = new VerticalBlank();

  const context = createContext({
    registers,
    memory,
    indexRegister,
    displayBuffer,
    programCounter,
    verticalBlank,
  });

  const instruction: Extract<Instruction, { kind: "draw-sprite" }> = {
    kind: "draw-sprite",
    opcode: opcode(0xdab1),
    x: registerIndex(0xa),
    y: registerIndex(0xb),
    height: 1,
  };

  const executor = createExecutor();

  executor.execute(instruction, context);

  assertEquals(programCounter.getValue(), address(0x200));

  assertEquals(displayBuffer.getPixel(0, 0), false);

  // Model the CPU fetching the same instruction again.
  programCounter.setValue(address(0x202));

  verticalBlank.signal();

  executor.execute(instruction, context);

  assertEquals(programCounter.getValue(), address(0x202));

  assertEquals(displayBuffer.getPixel(0, 0), true);

  assertEquals(verticalBlank.consume(), false);
});

Deno.test("DRW with zero height still waits for vertical blank", () => {
  const registers = new Registers();
  registers.set(FLAG_REGISTER, byte(1));

  const displayBuffer = createFixedDisplayBuffer(8, 8);
  displayBuffer.setPixel(2, 3, true);

  const programCounter = new ProgramCounter(address(0x202));
  const verticalBlank = new VerticalBlank();

  const context = createContext({
    registers,
    displayBuffer,
    programCounter,
    verticalBlank,
  });

  const executor = createExecutor();

  executor.execute(
    {
      kind: "draw-sprite",
      opcode: opcode(0xdab0),
      x: registerIndex(0xa),
      y: registerIndex(0xb),
      height: 0,
    },
    context,
  );

  assertEquals(programCounter.getValue(), address(0x200));
  assertEquals(displayBuffer.getPixel(2, 3), true);
  assertEquals(registers.get(FLAG_REGISTER), byte(1));
});

Deno.test("DRW with zero height consumes vertical blank without drawing", () => {
  const registers = new Registers();
  registers.set(FLAG_REGISTER, byte(1));

  const displayBuffer = createFixedDisplayBuffer(8, 8);
  displayBuffer.setPixel(2, 3, true);

  const programCounter = new ProgramCounter(address(0x202));
  const verticalBlank = new VerticalBlank();

  verticalBlank.signal();

  const context = createContext({
    registers,
    displayBuffer,
    programCounter,
    verticalBlank,
  });

  const executor = createExecutor();

  executor.execute(
    {
      kind: "draw-sprite",
      opcode: opcode(0xdab0),
      x: registerIndex(0xa),
      y: registerIndex(0xb),
      height: 0,
    },
    context,
  );

  assertEquals(programCounter.getValue(), address(0x202));
  assertEquals(displayBuffer.getPixel(2, 3), true);
  assertEquals(registers.get(FLAG_REGISTER), byte(0));
  assertEquals(verticalBlank.consume(), false);
});

Deno.test("LD I, addr stores the address in the index register", () => {
  const indexRegister = new IndexRegister();
  const context = createContext({ indexRegister });
  const executor = createExecutor();

  executor.execute(
    {
      kind: "set-index",
      opcode: opcode(0xa345),
      address: address(0x345),
    },
    context,
  );

  assertEquals(indexRegister.getValue(), address(0x345));
});

Deno.test("LD I, addr replaces the previous index register value", () => {
  const indexRegister = new IndexRegister(address(0x200));
  const context = createContext({ indexRegister });
  const executor = createExecutor();

  executor.execute(
    {
      kind: "set-index",
      opcode: opcode(0xaabc),
      address: address(0xabc),
    },
    context,
  );

  assertEquals(indexRegister.getValue(), address(0xabc));
});

Deno.test("JP V0, addr jumps to address plus V0", () => {
  const registers = new Registers();
  const programCounter = new ProgramCounter(address(0x200));

  registers.set(registerIndex(0), byte(0x05));

  const context = createContext({
    registers,
    programCounter,
  });

  const executor = createExecutor();

  executor.execute(
    {
      kind: "jump-with-offset",
      opcode: opcode(0xb300),
      register: registerIndex(0x3),
      address: address(0x300),
    },
    context,
  );

  assertEquals(programCounter.getValue(), address(0x305));
});

Deno.test("JP V0, addr uses V0 regardless of other register values", () => {
  const registers = new Registers();
  const programCounter = new ProgramCounter(address(0x200));

  registers.set(registerIndex(0), byte(0x07));
  registers.set(registerIndex(0xa), byte(0x55));

  const context = createContext({
    registers,
    programCounter,
  });

  const executor = createExecutor();

  executor.execute(
    {
      kind: "jump-with-offset",
      opcode: opcode(0xba00),
      register: registerIndex(0xa),
      address: address(0xa00),
    },
    context,
  );

  assertEquals(programCounter.getValue(), address(0xa07));
});

Deno.test("JP uses Vx as the offset when configured", () => {
  const registers = new Registers();

  registers.set(registerIndex(0), byte(0x10));

  registers.set(registerIndex(3), byte(0x24));

  const context = createContext({
    registers,
  });

  const executor = createExecutor({
    ...CLASSIC_CHIP8_PROFILE.quirks,
    jumpOffsetSource: "vx",
  });

  executor.execute(
    {
      kind: "jump-with-offset",
      opcode: opcode(0xb300),
      register: registerIndex(3),
      address: address(0x300),
    },
    context,
  );

  assertEquals(context.programCounter.getValue(), address(0x324));
});

Deno.test("RND Vx, byte stores random byte AND mask", () => {
  const registers = new Registers();

  const randomNumberGenerator = new TestRandomNumberGenerator([byte(0b1010_1010)]);

  const context = createContext({
    registers,
    randomNumberGenerator,
  });

  const executor = createExecutor();

  executor.execute(
    {
      kind: "random-and",
      opcode: opcode(0xca0f),
      register: registerIndex(0xa),
      mask: byte(0x0f),
    },
    context,
  );

  assertEquals(registers.get(registerIndex(0xa)), byte(0x0a));
});

Deno.test("RND Vx, byte performs a bitwise AND", () => {
  const registers = new Registers();

  const randomNumberGenerator = new TestRandomNumberGenerator([byte(0b1100_1010)]);

  const context = createContext({
    registers,
    randomNumberGenerator,
  });

  const executor = createExecutor();

  executor.execute(
    {
      kind: "random-and",
      opcode: opcode(0xca55),
      register: registerIndex(0xa),
      mask: byte(0x55),
    },
    context,
  );

  assertEquals(registers.get(registerIndex(0xa)), byte(0b0100_0000));
});

Deno.test("RND Vx, byte requests a new random byte for each execution", () => {
  const registers = new Registers();

  const randomNumberGenerator = new TestRandomNumberGenerator([byte(0x12), byte(0xab)]);

  const context = createContext({
    registers,
    randomNumberGenerator,
  });

  const executor = createExecutor();

  executor.execute(
    {
      kind: "random-and",
      opcode: opcode(0xcaff),
      register: registerIndex(0xa),
      mask: byte(0xff),
    },
    context,
  );

  assertEquals(registers.get(registerIndex(0xa)), byte(0x12));

  executor.execute(
    {
      kind: "random-and",
      opcode: opcode(0xcaff),
      register: registerIndex(0xa),
      mask: byte(0xff),
    },
    context,
  );

  assertEquals(registers.get(registerIndex(0xa)), byte(0xab));
});

Deno.test("SKP Vx skips when the corresponding key is pressed", () => {
  const registers = new Registers();
  const programCounter = new ProgramCounter(address(0x200));
  const keyboard = new KeyboardState();

  registers.set(registerIndex(0xa), byte(0x5));
  keyboard.press(key(0x5));

  const context = createContext({
    registers,
    programCounter,
    keyboard,
  });

  const executor = createExecutor();

  executor.execute(
    {
      kind: "skip-key-pressed",
      opcode: opcode(0xea9e),
      register: registerIndex(0xa),
    },
    context,
  );

  assertEquals(programCounter.getValue(), address(0x202));
});

Deno.test("SKP Vx does not skip when the corresponding key is not pressed", () => {
  const registers = new Registers();
  const programCounter = new ProgramCounter(address(0x200));
  const keyboard = new KeyboardState();

  registers.set(registerIndex(0xa), byte(0x5));

  const context = createContext({
    registers,
    programCounter,
    keyboard,
  });

  const executor = createExecutor();

  executor.execute(
    {
      kind: "skip-key-pressed",
      opcode: opcode(0xea9e),
      register: registerIndex(0xa),
    },
    context,
  );

  assertEquals(programCounter.getValue(), address(0x200));
});

Deno.test("SKP Vx uses only the low nibble of Vx as the key", () => {
  const registers = new Registers();
  const programCounter = new ProgramCounter(address(0x200));
  const keyboard = new KeyboardState();

  registers.set(registerIndex(0xa), byte(0xab));
  keyboard.press(key(0xb));

  const context = createContext({
    registers,
    programCounter,
    keyboard,
  });

  const executor = createExecutor();

  executor.execute(
    {
      kind: "skip-key-pressed",
      opcode: opcode(0xea9e),
      register: registerIndex(0xa),
    },
    context,
  );

  assertEquals(programCounter.getValue(), address(0x202));
});

Deno.test("SKNP Vx skips when the corresponding key is not pressed", () => {
  const registers = new Registers();
  const programCounter = new ProgramCounter(address(0x200));
  const keyboard = new KeyboardState();

  registers.set(registerIndex(0xa), byte(0x5));

  const context = createContext({
    registers,
    programCounter,
    keyboard,
  });

  const executor = createExecutor();

  executor.execute(
    {
      kind: "skip-key-not-pressed",
      opcode: opcode(0xeaa1),
      register: registerIndex(0xa),
    },
    context,
  );

  assertEquals(programCounter.getValue(), address(0x202));
});

Deno.test("SKNP Vx does not skip when the corresponding key is pressed", () => {
  const registers = new Registers();
  const programCounter = new ProgramCounter(address(0x200));
  const keyboard = new KeyboardState();

  registers.set(registerIndex(0xa), byte(0x5));
  keyboard.press(key(0x5));

  const context = createContext({
    registers,
    programCounter,
    keyboard,
  });

  const executor = createExecutor();

  executor.execute(
    {
      kind: "skip-key-not-pressed",
      opcode: opcode(0xeaa1),
      register: registerIndex(0xa),
    },
    context,
  );

  assertEquals(programCounter.getValue(), address(0x200));
});

Deno.test("SKNP Vx uses only the low nibble of Vx as the key", () => {
  const registers = new Registers();
  const programCounter = new ProgramCounter(address(0x200));
  const keyboard = new KeyboardState();

  registers.set(registerIndex(0xa), byte(0xab));
  keyboard.press(key(0xb));

  const context = createContext({
    registers,
    programCounter,
    keyboard,
  });

  const executor = createExecutor();

  executor.execute(
    {
      kind: "skip-key-not-pressed",
      opcode: opcode(0xeaa1),
      register: registerIndex(0xa),
    },
    context,
  );

  assertEquals(programCounter.getValue(), address(0x200));
});

Deno.test("LD Vx, DT copies the delay timer value into Vx", () => {
  const registers = new Registers();
  const delayTimer = new Timer(byte(0x42));

  const context = createContext({
    registers,
    delayTimer,
  });

  const executor = createExecutor();

  executor.execute(
    {
      kind: "get-delay-timer",
      opcode: opcode(0xfa07),
      register: registerIndex(0xa),
    },
    context,
  );

  assertEquals(registers.get(registerIndex(0xa)), byte(0x42));
});

Deno.test("LD DT, Vx copies Vx into the delay timer", () => {
  const registers = new Registers();
  const delayTimer = new Timer();

  registers.set(registerIndex(0xa), byte(0x42));

  const context = createContext({
    registers,
    delayTimer,
  });

  const executor = createExecutor();

  executor.execute(
    {
      kind: "set-delay-timer",
      opcode: opcode(0xfa15),
      register: registerIndex(0xa),
    },
    context,
  );

  assertEquals(delayTimer.getValue(), byte(0x42));
});

Deno.test("LD ST, Vx copies Vx into the sound timer", () => {
  const registers = new Registers();
  const soundTimer = new Timer();

  registers.set(registerIndex(0xa), byte(0x42));

  const context = createContext({
    registers,
    soundTimer,
  });

  const executor = createExecutor();

  executor.execute(
    {
      kind: "set-sound-timer",
      opcode: opcode(0xfa18),
      register: registerIndex(0xa),
    },
    context,
  );

  assertEquals(soundTimer.getValue(), byte(0x42));
});

Deno.test("ADD I, Vx adds Vx to the index register", () => {
  const registers = new Registers();
  const indexRegister = new IndexRegister(address(0x300));

  registers.set(registerIndex(0x2), byte(0x42));

  const context = createContext({
    registers,
    indexRegister,
  });

  const executor = createExecutor();

  executor.execute(
    {
      kind: "add-to-index",
      opcode: opcode(0xf21e),
      register: registerIndex(0x2),
    },
    context,
  );

  assertEquals(indexRegister.getValue(), address(0x342));
});

Deno.test("ADD I, Vx preserves results above the CHIP-8 memory address range", () => {
  const registers = new Registers();
  const indexRegister = new IndexRegister(address(0xfe0));

  registers.set(registerIndex(0x2), byte(0x40));

  const context = createContext({
    registers,
    indexRegister,
  });

  const executor = createExecutor();

  executor.execute(
    {
      kind: "add-to-index",
      opcode: opcode(0xf21e),
      register: registerIndex(0x2),
    },
    context,
  );

  assertEquals(indexRegister.getValue(), address(0x1020));
});

Deno.test("ADD I, VF uses VF as the operand without modifying it", () => {
  const registers = new Registers();
  const indexRegister = new IndexRegister(address(0x300));

  registers.set(FLAG_REGISTER, byte(0x42));

  const context = createContext({
    registers,
    indexRegister,
  });

  const executor = createExecutor();

  executor.execute(
    {
      kind: "add-to-index",
      opcode: opcode(0xff1e),
      register: FLAG_REGISTER,
    },
    context,
  );

  assertEquals(indexRegister.getValue(), address(0x342));
  assertEquals(registers.get(FLAG_REGISTER), byte(0x42));
});

Deno.test(
  "LD F, Vx resolves Vx through the configured font and stores the address in I",
  () => {
    const registers = new Registers();
    const indexRegister = new IndexRegister();
    const spriteAddress = address(0x345);
    let requestedValue: Byte | undefined;

    const font: Font = {
      getSpriteAddress(value: Byte) {
        requestedValue = value;
        return spriteAddress;
      },
    };

    registers.set(registerIndex(0xa), byte(0xab));

    const context = createContext({
      registers,
      indexRegister,
      font,
    });

    const executor = createExecutor();

    executor.execute(
      {
        kind: "set-index-to-sprite",
        opcode: opcode(0xfa29),
        register: registerIndex(0xa),
      },
      context,
    );

    assertEquals(requestedValue, byte(0xab));
    assertEquals(indexRegister.getValue(), spriteAddress);
  },
);

Deno.test("LD B, Vx stores the BCD representation of Vx in memory", () => {
  const registers = new Registers();
  const memory = new Ram(0x1000);
  const indexRegister = new IndexRegister(address(0x300));

  registers.set(registerIndex(0x3), byte(156));

  const context = createContext({
    registers,
    memory,
    indexRegister,
  });

  const executor = createExecutor();

  executor.execute(
    {
      kind: "store-bcd",
      opcode: opcode(0xf333),
      register: registerIndex(0x3),
    },
    context,
  );

  assertEquals(memory.read(address(0x300)), byte(1));
  assertEquals(memory.read(address(0x301)), byte(5));
  assertEquals(memory.read(address(0x302)), byte(6));
});

Deno.test("LD B, Vx stores 000 when Vx is zero", () => {
  const registers = new Registers();
  const memory = new Ram(0x1000);
  const indexRegister = new IndexRegister(address(0x300));

  registers.set(registerIndex(0x3), byte(0));

  const context = createContext({
    registers,
    memory,
    indexRegister,
  });

  const executor = createExecutor();

  executor.execute(
    {
      kind: "store-bcd",
      opcode: opcode(0xf333),
      register: registerIndex(0x3),
    },
    context,
  );

  assertEquals(memory.read(address(0x300)), byte(0));
  assertEquals(memory.read(address(0x301)), byte(0));
  assertEquals(memory.read(address(0x302)), byte(0));
});

Deno.test("LD B, Vx stores 255 when Vx contains the maximum byte value", () => {
  const registers = new Registers();
  const memory = new Ram(0x1000);
  const indexRegister = new IndexRegister(address(0x300));

  registers.set(registerIndex(0x3), byte(255));

  const context = createContext({
    registers,
    memory,
    indexRegister,
  });

  const executor = createExecutor();

  executor.execute(
    {
      kind: "store-bcd",
      opcode: opcode(0xf333),
      register: registerIndex(0x3),
    },
    context,
  );

  assertEquals(memory.read(address(0x300)), byte(2));
  assertEquals(memory.read(address(0x301)), byte(5));
  assertEquals(memory.read(address(0x302)), byte(5));
});

Deno.test("LD [I], Vx stores V0 through Vx in memory and advances I", () => {
  const registers = new Registers();
  const memory = new Ram(0x1000);
  const indexRegister = new IndexRegister(address(0x300));

  registers.set(registerIndex(0x0), byte(0x10));
  registers.set(registerIndex(0x1), byte(0x20));
  registers.set(registerIndex(0x2), byte(0x30));
  registers.set(registerIndex(0x3), byte(0x40));

  memory.write(address(0x304), byte(0xaa));

  const context = createContext({
    registers,
    memory,
    indexRegister,
  });

  const executor = createExecutor();

  executor.execute(
    {
      kind: "store-registers",
      opcode: opcode(0xf355),
      register: registerIndex(0x3),
    },
    context,
  );

  assertEquals(memory.read(address(0x300)), byte(0x10));
  assertEquals(memory.read(address(0x301)), byte(0x20));
  assertEquals(memory.read(address(0x302)), byte(0x30));
  assertEquals(memory.read(address(0x303)), byte(0x40));

  assertEquals(memory.read(address(0x304)), byte(0xaa));
  assertEquals(indexRegister.getValue(), address(0x304));
});

Deno.test("LD [I], V0 stores only V0 and advances I by one", () => {
  const registers = new Registers();
  const memory = new Ram(0x1000);
  const indexRegister = new IndexRegister(address(0x300));

  registers.set(registerIndex(0x0), byte(0x42));

  const context = createContext({
    registers,
    memory,
    indexRegister,
  });

  const executor = createExecutor();

  executor.execute(
    {
      kind: "store-registers",
      opcode: opcode(0xf055),
      register: registerIndex(0x0),
    },
    context,
  );

  assertEquals(memory.read(address(0x300)), byte(0x42));
  assertEquals(indexRegister.getValue(), address(0x301));
});

Deno.test("LD [I], VF stores all sixteen registers and advances I by sixteen", () => {
  const registers = new Registers();
  const memory = new Ram(0x1000);
  const indexRegister = new IndexRegister(address(0x300));

  for (let index = 0; index <= 0xf; index++) {
    registers.set(registerIndex(index), byte(0x10 + index));
  }

  const context = createContext({
    registers,
    memory,
    indexRegister,
  });

  const executor = createExecutor();

  executor.execute(
    {
      kind: "store-registers",
      opcode: opcode(0xff55),
      register: registerIndex(0xf),
    },
    context,
  );

  for (let index = 0; index <= 0xf; index++) {
    assertEquals(memory.read(address(0x300 + index)), byte(0x10 + index));
  }

  assertEquals(indexRegister.getValue(), address(0x310));
});

Deno.test("LD [I], Vx leaves I unchanged when configured", () => {
  const context = createContext();

  context.indexRegister.setValue(address(0x300));

  context.registers.set(registerIndex(0), byte(0x11));

  context.registers.set(registerIndex(1), byte(0x22));

  context.registers.set(registerIndex(2), byte(0x33));

  const executor = createExecutor({
    ...CLASSIC_CHIP8_PROFILE.quirks,
    memoryTransferIndex: "unchanged",
  });

  executor.execute(
    {
      kind: "store-registers",
      opcode: opcode(0xf255),
      register: registerIndex(0x2),
    },
    context,
  );

  assertEquals(context.memory.read(address(0x300)), byte(0x11));

  assertEquals(context.memory.read(address(0x301)), byte(0x22));

  assertEquals(context.memory.read(address(0x302)), byte(0x33));

  assertEquals(context.indexRegister.getValue(), address(0x300));
});

Deno.test("LD [I], Vx advances I by X when configured", () => {
  const context = createContext();

  context.indexRegister.setValue(address(0x300));

  context.registers.set(registerIndex(0), byte(0x11));
  context.registers.set(registerIndex(1), byte(0x22));
  context.registers.set(registerIndex(2), byte(0x33));

  const executor = createExecutor({
    ...CLASSIC_CHIP8_PROFILE.quirks,
    memoryTransferIndex: "increment-by-x",
  });

  executor.execute(
    {
      kind: "store-registers",
      opcode: opcode(0xf255),
      register: registerIndex(0x2),
    },
    context,
  );

  assertEquals(context.memory.read(address(0x300)), byte(0x11));
  assertEquals(context.memory.read(address(0x301)), byte(0x22));
  assertEquals(context.memory.read(address(0x302)), byte(0x33));

  assertEquals(context.indexRegister.getValue(), address(0x302));
});

Deno.test("LD Vx, [I] loads V0 through Vx from memory and advances I", () => {
  const registers = new Registers();
  const memory = new Ram(0x1000);
  const indexRegister = new IndexRegister(address(0x300));

  memory.write(address(0x300), byte(0x10));
  memory.write(address(0x301), byte(0x20));
  memory.write(address(0x302), byte(0x30));
  memory.write(address(0x303), byte(0x40));

  registers.set(registerIndex(0x4), byte(0xaa));

  const context = createContext({
    registers,
    memory,
    indexRegister,
  });

  const executor = createExecutor();

  executor.execute(
    {
      kind: "load-registers",
      opcode: opcode(0xf365),
      register: registerIndex(0x3),
    },
    context,
  );

  assertEquals(registers.get(registerIndex(0x0)), byte(0x10));
  assertEquals(registers.get(registerIndex(0x1)), byte(0x20));
  assertEquals(registers.get(registerIndex(0x2)), byte(0x30));
  assertEquals(registers.get(registerIndex(0x3)), byte(0x40));

  assertEquals(registers.get(registerIndex(0x4)), byte(0xaa));
  assertEquals(indexRegister.getValue(), address(0x304));
});

Deno.test("LD V0, [I] loads only V0 and advances I by one", () => {
  const registers = new Registers();
  const memory = new Ram(0x1000);
  const indexRegister = new IndexRegister(address(0x300));

  memory.write(address(0x300), byte(0x42));

  const context = createContext({
    registers,
    memory,
    indexRegister,
  });

  const executor = createExecutor();

  executor.execute(
    {
      kind: "load-registers",
      opcode: opcode(0xf065),
      register: registerIndex(0x0),
    },
    context,
  );

  assertEquals(registers.get(registerIndex(0x0)), byte(0x42));
  assertEquals(indexRegister.getValue(), address(0x301));
});

Deno.test("LD VF, [I] loads all sixteen registers and advances I by sixteen", () => {
  const registers = new Registers();
  const memory = new Ram(0x1000);
  const indexRegister = new IndexRegister(address(0x300));

  for (let index = 0; index <= 0xf; index++) {
    memory.write(address(0x300 + index), byte(0x10 + index));
  }

  const context = createContext({
    registers,
    memory,
    indexRegister,
  });

  const executor = createExecutor();

  executor.execute(
    {
      kind: "load-registers",
      opcode: opcode(0xff65),
      register: registerIndex(0xf),
    },
    context,
  );

  for (let index = 0; index <= 0xf; index++) {
    assertEquals(registers.get(registerIndex(index)), byte(0x10 + index));
  }

  assertEquals(indexRegister.getValue(), address(0x310));
});

Deno.test("LD Vx, [I] leaves I unchanged when configured", () => {
  const context = createContext();

  context.indexRegister.setValue(address(0x300));

  context.memory.write(address(0x300), byte(0x11));

  context.memory.write(address(0x301), byte(0x22));

  context.memory.write(address(0x302), byte(0x33));

  const executor = createExecutor({
    ...CLASSIC_CHIP8_PROFILE.quirks,
    memoryTransferIndex: "unchanged",
  });

  executor.execute(
    {
      kind: "load-registers",
      opcode: opcode(0xf265),
      register: registerIndex(0x2),
    },
    context,
  );

  assertEquals(context.registers.get(registerIndex(0)), byte(0x11));

  assertEquals(context.registers.get(registerIndex(1)), byte(0x22));

  assertEquals(context.registers.get(registerIndex(2)), byte(0x33));

  assertEquals(context.indexRegister.getValue(), address(0x300));
});

Deno.test("LD Vx, [I] advances I by X when configured", () => {
  const context = createContext();

  context.indexRegister.setValue(address(0x300));

  context.memory.write(address(0x300), byte(0x11));
  context.memory.write(address(0x301), byte(0x22));
  context.memory.write(address(0x302), byte(0x33));

  const executor = createExecutor({
    ...CLASSIC_CHIP8_PROFILE.quirks,
    memoryTransferIndex: "increment-by-x",
  });

  executor.execute(
    {
      kind: "load-registers",
      opcode: opcode(0xf265),
      register: registerIndex(0x2),
    },
    context,
  );

  assertEquals(context.registers.get(registerIndex(0)), byte(0x11));
  assertEquals(context.registers.get(registerIndex(1)), byte(0x22));
  assertEquals(context.registers.get(registerIndex(2)), byte(0x33));

  assertEquals(context.indexRegister.getValue(), address(0x302));
});

Deno.test("LD Vx, K repeats the instruction while waiting for a key release", () => {
  const registers = new Registers();
  const keyboard = new KeyboardState();
  const programCounter = new ProgramCounter(address(0x302));

  registers.set(registerIndex(0xa), byte(0x42));

  const context = createContext({
    registers,
    keyboard,
    programCounter,
  });

  const executor = createExecutor();

  executor.execute(
    {
      kind: "wait-for-key",
      opcode: opcode(0xfa0a),
      register: registerIndex(0xa),
    },
    context,
  );

  assertEquals(registers.get(registerIndex(0xa)), byte(0x42));
  assertEquals(programCounter.getValue(), address(0x300));
});

Deno.test("LD Vx, K stores the released key and continues execution", () => {
  const registers = new Registers();
  const keyboard = new KeyboardState();
  const programCounter = new ProgramCounter(address(0x302));

  const context = createContext({
    registers,
    keyboard,
    programCounter,
  });

  const executor = createExecutor();

  const instruction: Instruction = {
    kind: "wait-for-key",
    opcode: opcode(0xfa0a),
    register: registerIndex(0xa),
  };

  executor.execute(instruction, context);

  assertEquals(programCounter.getValue(), address(0x300));

  keyboard.press(key(0xb));
  keyboard.release(key(0xb));

  // Simulate the next CPU fetch of the same instruction:
  // 0x300 -> 0x302 before execution.
  programCounter.setValue(address(0x302));

  executor.execute(instruction, context);

  assertEquals(registers.get(registerIndex(0xa)), byte(0x0b));
  assertEquals(programCounter.getValue(), address(0x302));
});

Deno.test("00E0 clears a SUPER-CHIP display without changing its mode", () => {
  const displayBuffer = new DisplayBuffer(
    {
      kind: "superchip",
      backingWidth: 128,
      backingHeight: 64,
      initialMode: "low",
    },
    "clip",
  );

  const context = createContext({ displayBuffer });

  const executor = createExecutor();

  displayBuffer.setMode("high");
  displayBuffer.setPixel(100, 50, true);

  assertEquals(displayBuffer.width, 128);
  assertEquals(displayBuffer.height, 64);
  assertEquals(displayBuffer.getPixel(100, 50), true);

  executor.execute(
    {
      kind: "clear-screen",
      opcode: opcode(0x00e0),
    },
    context,
  );

  assertEquals(displayBuffer.width, 128);
  assertEquals(displayBuffer.height, 64);
  assertEquals(displayBuffer.getPixel(100, 50), false);
});

Deno.test("HIGH selects high-resolution mode without clearing the display", () => {
  const displayBuffer = new DisplayBuffer(
    {
      kind: "superchip",
      backingWidth: 128,
      backingHeight: 64,
      initialMode: "low",
    },
    "clip",
  );

  displayBuffer.setPixel(100, 50, true);

  const context = createContext({ displayBuffer });
  const executor = createExecutor(SUPERCHIP_PROFILE.quirks, SUPERCHIP_PROFILE.instructionSet);

  executor.execute(
    {
      kind: "set-display-mode",
      opcode: opcode(0x00ff),
      mode: "high",
    },
    context,
  );

  assertEquals(displayBuffer.width, 128);
  assertEquals(displayBuffer.height, 64);
  assertEquals(displayBuffer.getPixel(100, 50), true);
});

Deno.test("LOW selects low-resolution mode without clearing the display", () => {
  const displayBuffer = new DisplayBuffer(
    {
      kind: "superchip",
      backingWidth: 128,
      backingHeight: 64,
      initialMode: "low",
    },
    "clip",
  );

  displayBuffer.setMode("high");
  displayBuffer.setPixel(100, 50, true);

  const context = createContext({ displayBuffer });
  const executor = createExecutor(SUPERCHIP_PROFILE.quirks, SUPERCHIP_PROFILE.instructionSet);

  executor.execute(
    {
      kind: "set-display-mode",
      opcode: opcode(0x00fe),
      mode: "low",
    },
    context,
  );

  assertEquals(displayBuffer.width, 64);
  assertEquals(displayBuffer.height, 32);
  assertEquals(displayBuffer.getPixel(100, 50), true);
});

Deno.test("SCD scrolls the SUPER-CHIP backing framebuffer down", () => {
  const displayBuffer = new DisplayBuffer(
    {
      kind: "superchip",
      backingWidth: 128,
      backingHeight: 64,
      initialMode: "low",
    },
    "clip",
  );

  displayBuffer.setPixel(10, 10, true);

  const context = createContext({ displayBuffer });
  const executor = createExecutor(SUPERCHIP_PROFILE.quirks, SUPERCHIP_PROFILE.instructionSet);

  executor.execute(
    {
      kind: "scroll-display-down",
      opcode: opcode(0x00c3),
      rows: 3,
    },
    context,
  );

  assertEquals(displayBuffer.getPixel(10, 10), false);
  assertEquals(displayBuffer.getPixel(10, 13), true);

  // Scrolling does not alter the current display mode.
  assertEquals(displayBuffer.width, 64);
  assertEquals(displayBuffer.height, 32);
});

Deno.test("SCR scrolls the SUPER-CHIP backing framebuffer right", () => {
  const displayBuffer = new DisplayBuffer(
    {
      kind: "superchip",
      backingWidth: 128,
      backingHeight: 64,
      initialMode: "low",
    },
    "clip",
  );

  displayBuffer.setPixel(10, 10, true);

  const context = createContext({ displayBuffer });
  const executor = createExecutor(SUPERCHIP_PROFILE.quirks, SUPERCHIP_PROFILE.instructionSet);

  executor.execute(
    {
      kind: "scroll-display-horizontal",
      opcode: opcode(0x00fb),
      direction: "right",
      columns: 4,
    },
    context,
  );

  assertEquals(displayBuffer.getPixel(10, 10), false);
  assertEquals(displayBuffer.getPixel(14, 10), true);
});

Deno.test("SCL scrolls the SUPER-CHIP backing framebuffer left", () => {
  const displayBuffer = new DisplayBuffer(
    {
      kind: "superchip",
      backingWidth: 128,
      backingHeight: 64,
      initialMode: "low",
    },
    "clip",
  );

  displayBuffer.setPixel(10, 10, true);

  const context = createContext({ displayBuffer });
  const executor = createExecutor(SUPERCHIP_PROFILE.quirks, SUPERCHIP_PROFILE.instructionSet);

  executor.execute(
    {
      kind: "scroll-display-horizontal",
      opcode: opcode(0x00fc),
      direction: "left",
      columns: 4,
    },
    context,
  );

  assertEquals(displayBuffer.getPixel(10, 10), false);
  assertEquals(displayBuffer.getPixel(6, 10), true);
});

Deno.test(
  "DRW in SUPER-CHIP high-resolution mode sets VF to the number of colliding rows",
  () => {
    const registers = new Registers();
    registers.set(registerIndex(0xa), byte(0x00));
    registers.set(registerIndex(0xb), byte(0x00));

    const memory = new Ram(0x1000);

    // Two sprite rows, each with the leftmost pixel set.
    memory.write(address(0x300), byte(0b1000_0000));
    memory.write(address(0x301), byte(0b1000_0000));

    const indexRegister = new IndexRegister(address(0x300));

    const displayBuffer = new DisplayBuffer(
      {
        kind: "superchip",
        backingWidth: 128,
        backingHeight: 64,
        initialMode: "low",
      },
      "clip",
    );

    displayBuffer.setMode("high");

    // Arrange one collision in each sprite row.
    displayBuffer.setPixel(0, 0, true);
    displayBuffer.setPixel(0, 1, true);

    const verticalBlank = new VerticalBlank();
    verticalBlank.signal();

    const context = createContext({
      registers,
      memory,
      indexRegister,
      displayBuffer,
      verticalBlank,
    });

    const executor = createExecutor(SUPERCHIP_PROFILE.quirks, SUPERCHIP_PROFILE.instructionSet);

    executor.execute(
      {
        kind: "draw-sprite",
        opcode: opcode(0xdab2),
        x: registerIndex(0xa),
        y: registerIndex(0xb),
        height: 2,
      },
      context,
    );

    assertEquals(displayBuffer.getPixel(0, 0), false);
    assertEquals(displayBuffer.getPixel(0, 1), false);

    assertEquals(registers.get(FLAG_REGISTER), byte(2));
  },
);

Deno.test(
  "DRW in SUPER-CHIP high-resolution mode counts rows clipped below the bottom in VF",
  () => {
    const registers = new Registers();

    registers.set(registerIndex(0xa), byte(0x00));
    registers.set(registerIndex(0xb), byte(0x3f));

    const memory = new Ram(0x1000);

    // Three sprite rows. Starting at Y=63 means only the first row is visible.
    memory.write(address(0x300), byte(0b1000_0000));
    memory.write(address(0x301), byte(0b1000_0000));
    memory.write(address(0x302), byte(0b1000_0000));

    const indexRegister = new IndexRegister(address(0x300));

    const displayBuffer = new DisplayBuffer(
      {
        kind: "superchip",
        backingWidth: 128,
        backingHeight: 64,
        initialMode: "low",
      },
      "clip",
    );

    displayBuffer.setMode("high");

    const verticalBlank = new VerticalBlank();
    verticalBlank.signal();

    const context = createContext({
      registers,
      memory,
      indexRegister,
      displayBuffer,
      verticalBlank,
    });

    const executor = createExecutor(SUPERCHIP_PROFILE.quirks, SUPERCHIP_PROFILE.instructionSet);

    executor.execute(
      {
        kind: "draw-sprite",
        opcode: opcode(0xdab3),
        x: registerIndex(0xa),
        y: registerIndex(0xb),
        height: 3,
      },
      context,
    );

    // The first row is visible and drawn normally.
    assertEquals(displayBuffer.getPixel(0, 63), true);

    // No pixels collided, but two sprite rows fell below the display.
    assertEquals(registers.get(FLAG_REGISTER), byte(2));
  },
);

Deno.test("Dxy0 draws an 8x16 sprite in SUPER-CHIP low-resolution mode", () => {
  const registers = new Registers();
  registers.set(registerIndex(0xa), byte(0x00));
  registers.set(registerIndex(0xb), byte(0x00));

  const memory = new Ram(0x1000);

  // First pixel of the first row.
  memory.write(address(0x300), byte(0b1000_0000));

  // Last pixel of the sixteenth row.
  memory.write(address(0x30f), byte(0b0000_0001));

  const indexRegister = new IndexRegister(address(0x300));

  const displayBuffer = new DisplayBuffer(
    {
      kind: "superchip",
      backingWidth: 128,
      backingHeight: 64,
      initialMode: "low",
    },
    "clip",
  );

  const verticalBlank = new VerticalBlank();
  verticalBlank.signal();

  const context = createContext({
    registers,
    memory,
    indexRegister,
    displayBuffer,
    verticalBlank,
  });

  const executor = createExecutor(SUPERCHIP_PROFILE.quirks, SUPERCHIP_PROFILE.instructionSet);

  executor.execute(
    {
      kind: "draw-sprite",
      opcode: opcode(0xdab0),
      x: registerIndex(0xa),
      y: registerIndex(0xb),
      height: 0,
    },
    context,
  );

  // Logical (0, 0) maps to a 2×2 backing block.
  assertEquals(displayBuffer.getPixel(0, 0), true);
  assertEquals(displayBuffer.getPixel(1, 0), true);
  assertEquals(displayBuffer.getPixel(0, 1), true);
  assertEquals(displayBuffer.getPixel(1, 1), true);

  // Logical (7, 15) maps to backing coordinates (14..15, 30..31).
  assertEquals(displayBuffer.getPixel(14, 30), true);
  assertEquals(displayBuffer.getPixel(15, 30), true);
  assertEquals(displayBuffer.getPixel(14, 31), true);
  assertEquals(displayBuffer.getPixel(15, 31), true);

  assertEquals(registers.get(FLAG_REGISTER), byte(0));
});

Deno.test("Dxy0 draws a 16x16 sprite in SUPER-CHIP high-resolution mode", () => {
  const registers = new Registers();
  registers.set(registerIndex(0xa), byte(0x00));
  registers.set(registerIndex(0xb), byte(0x00));

  const memory = new Ram(0x1000);

  // Row 0:
  // 10000000 00000001
  memory.write(address(0x300), byte(0b1000_0000));
  memory.write(address(0x301), byte(0b0000_0001));

  // Row 15:
  // 10000000 00000001
  memory.write(address(0x31e), byte(0b1000_0000));
  memory.write(address(0x31f), byte(0b0000_0001));

  const indexRegister = new IndexRegister(address(0x300));

  const displayBuffer = new DisplayBuffer(
    {
      kind: "superchip",
      backingWidth: 128,
      backingHeight: 64,
      initialMode: "low",
    },
    "clip",
  );

  displayBuffer.setMode("high");

  const verticalBlank = new VerticalBlank();
  verticalBlank.signal();

  const context = createContext({
    registers,
    memory,
    indexRegister,
    displayBuffer,
    verticalBlank,
  });

  const executor = createExecutor(SUPERCHIP_PROFILE.quirks, SUPERCHIP_PROFILE.instructionSet);

  executor.execute(
    {
      kind: "draw-sprite",
      opcode: opcode(0xdab0),
      x: registerIndex(0xa),
      y: registerIndex(0xb),
      height: 0,
    },
    context,
  );

  assertEquals(displayBuffer.getPixel(0, 0), true);
  assertEquals(displayBuffer.getPixel(15, 0), true);

  assertEquals(displayBuffer.getPixel(0, 15), true);
  assertEquals(displayBuffer.getPixel(15, 15), true);

  assertEquals(registers.get(FLAG_REGISTER), byte(0));
});

Deno.test("display-mode sprite timing uses vertical blank in low-resolution mode", () => {
  const registers = new Registers();
  registers.set(registerIndex(0xa), byte(0x00));
  registers.set(registerIndex(0xb), byte(0x00));

  const memory = new Ram(0x1000);
  memory.write(address(0x300), byte(0b1000_0000));

  const indexRegister = new IndexRegister(address(0x300));

  const displayBuffer = new DisplayBuffer(
    {
      kind: "superchip",
      backingWidth: 128,
      backingHeight: 64,
      initialMode: "low",
    },
    "clip",
  );

  const verticalBlank = new VerticalBlank();
  verticalBlank.signal();

  const context = createContext({
    registers,
    memory,
    indexRegister,
    displayBuffer,
    verticalBlank,
  });

  const executor = createExecutor({
    ...CLASSIC_CHIP8_PROFILE.quirks,
    spriteDrawTiming: {
      kind: "display-mode",
      low: "vertical-blank",
      high: "immediate",
    },
  });

  executor.execute(
    {
      kind: "draw-sprite",
      opcode: opcode(0xdab1),
      x: registerIndex(0xa),
      y: registerIndex(0xb),
      height: 1,
    },
    context,
  );

  // The sprite was drawn.
  assertEquals(displayBuffer.getPixel(0, 0), true);

  // Low-resolution timing consumed the pending vblank opportunity.
  assertEquals(verticalBlank.consume(), false);
});

Deno.test("display-mode sprite timing uses immediate drawing in high-resolution mode", () => {
  const registers = new Registers();
  registers.set(registerIndex(0xa), byte(0x00));
  registers.set(registerIndex(0xb), byte(0x00));

  const memory = new Ram(0x1000);
  memory.write(address(0x300), byte(0b1000_0000));

  const indexRegister = new IndexRegister(address(0x300));

  const displayBuffer = new DisplayBuffer(
    {
      kind: "superchip",
      backingWidth: 128,
      backingHeight: 64,
      initialMode: "low",
    },
    "clip",
  );

  displayBuffer.setMode("high");

  const verticalBlank = new VerticalBlank();
  verticalBlank.signal();

  const context = createContext({
    registers,
    memory,
    indexRegister,
    displayBuffer,
    verticalBlank,
  });

  const executor = createExecutor({
    ...CLASSIC_CHIP8_PROFILE.quirks,
    spriteDrawTiming: {
      kind: "display-mode",
      low: "vertical-blank",
      high: "immediate",
    },
  });

  executor.execute(
    {
      kind: "draw-sprite",
      opcode: opcode(0xdab1),
      x: registerIndex(0xa),
      y: registerIndex(0xb),
      height: 1,
    },
    context,
  );

  // High-resolution drawing happens immediately.
  assertEquals(displayBuffer.getPixel(0, 0), true);

  // Immediate drawing did not consume the pending vblank opportunity.
  assertEquals(verticalBlank.consume(), true);
});

Deno.test("EXIT marks the interpreter as exited when supported", () => {
  const exitState = new ExitState();

  const context = createContext({
    exitState,
  });

  const executor = createExecutor(SUPERCHIP_PROFILE.quirks, SUPERCHIP_PROFILE.instructionSet);

  assertEquals(exitState.isExited, false);

  executor.execute(
    {
      kind: "exit-interpreter",
      opcode: opcode(0x00fd),
    },
    context,
  );

  assertEquals(exitState.isExited, true);
});

Deno.test("EXIT is unsupported by Classic CHIP-8", () => {
  const context = createContext();
  const executor = createExecutor(CLASSIC_CHIP8_PROFILE.quirks);

  const instruction: Instruction = {
    kind: "exit-interpreter",
    opcode: opcode(0x00fd),
  };

  assertThrows(() => executor.execute(instruction, context), UnsupportedInstructionError);
  assertEquals(context.exitState.isExited, false);
});

Deno.test("SUPER-CHIP 00C0 exits instead of performing a zero-row scroll", () => {
  const displayBuffer = new DisplayBuffer(
    SUPERCHIP_PROFILE.display.specification,
    SUPERCHIP_PROFILE.quirks.spriteOverflow,
  );
  displayBuffer.setPixel(10, 10, true);

  const context = createContext({ displayBuffer });
  const executor = createExecutor(SUPERCHIP_PROFILE.quirks, SUPERCHIP_PROFILE.instructionSet);

  executor.execute(
    {
      kind: "scroll-display-down",
      opcode: opcode(0x00c0),
      rows: 0,
    },
    context,
  );

  assertEquals(context.exitState.isExited, true);
  assertEquals(displayBuffer.getPixel(10, 10), true);
});

Deno.test("SUPER-CHIP ADD I, Vx exits when I leaves memory", () => {
  const registers = new Registers();
  const indexRegister = new IndexRegister(address(0xfe0));
  const exitState = new ExitState();

  registers.set(registerIndex(0x2), byte(0x40));

  const context = createContext({
    registers,
    indexRegister,
    exitState,
  });
  const executor = createExecutor(SUPERCHIP_PROFILE.quirks, SUPERCHIP_PROFILE.instructionSet);

  executor.execute(
    {
      kind: "add-to-index",
      opcode: opcode(0xf21e),
      register: registerIndex(0x2),
    },
    context,
  );

  assertEquals(indexRegister.getValue(), address(0x1020));
  assertEquals(exitState.isExited, true);
});

Deno.test("Classic ADD I, Vx does not exit when I leaves memory", () => {
  const registers = new Registers();
  const indexRegister = new IndexRegister(address(0xfe0));
  const exitState = new ExitState();

  registers.set(registerIndex(0x2), byte(0x40));

  const context = createContext({
    registers,
    indexRegister,
    exitState,
  });
  const executor = createExecutor(CLASSIC_CHIP8_PROFILE.quirks);

  executor.execute(
    {
      kind: "add-to-index",
      opcode: opcode(0xf21e),
      register: registerIndex(0x2),
    },
    context,
  );

  assertEquals(indexRegister.getValue(), address(0x1020));
  assertEquals(exitState.isExited, false);
});

Deno.test("RPL stores are unsupported by Classic CHIP-8", () => {
  const context = createContext();
  const executor = createExecutor(CLASSIC_CHIP8_PROFILE.quirks);

  const instruction: Instruction = {
    kind: "store-rpl-flags",
    opcode: opcode(0xf275),
    register: registerIndex(2),
  };

  assertThrows(() => executor.execute(instruction, context), UnsupportedInstructionError);
});

Deno.test("RPL loads are unsupported by CHIP-48", () => {
  const context = createContext();
  const executor = createExecutor(CHIP48_PROFILE.quirks);

  const instruction: Instruction = {
    kind: "load-rpl-flags",
    opcode: opcode(0xf285),
    register: registerIndex(2),
  };

  assertThrows(() => executor.execute(instruction, context), UnsupportedInstructionError);
});

Deno.test("Classic CHIP-8 rejects SUPER-CHIP LOW before display mutation", () => {
  const displayBuffer = new DisplayBuffer(
    CLASSIC_CHIP8_PROFILE.display.specification,
    CLASSIC_CHIP8_PROFILE.quirks.spriteOverflow,
  );

  displayBuffer.setPixel(0, 0, true);

  const context = createContext({ displayBuffer });
  const executor = createExecutor(CLASSIC_CHIP8_PROFILE.quirks);

  const widthBefore = displayBuffer.width;
  const heightBefore = displayBuffer.height;

  assertThrows(
    () =>
      executor.execute(
        {
          kind: "set-display-mode",
          opcode: opcode(0x00fe),
          mode: "low",
        },
        context,
      ),
    UnsupportedInstructionError,
  );

  assertEquals(displayBuffer.width, widthBefore);
  assertEquals(displayBuffer.height, heightBefore);
  assertEquals(displayBuffer.getPixel(0, 0), true);
});

Deno.test("Classic CHIP-8 rejects SUPER-CHIP HIGH before display mutation", () => {
  const displayBuffer = new DisplayBuffer(
    CLASSIC_CHIP8_PROFILE.display.specification,
    CLASSIC_CHIP8_PROFILE.quirks.spriteOverflow,
  );

  displayBuffer.setPixel(0, 0, true);

  const context = createContext({ displayBuffer });
  const executor = createExecutor(CLASSIC_CHIP8_PROFILE.quirks);

  const widthBefore = displayBuffer.width;
  const heightBefore = displayBuffer.height;

  assertThrows(
    () =>
      executor.execute(
        {
          kind: "set-display-mode",
          opcode: opcode(0x00ff),
          mode: "high",
        },
        context,
      ),
    UnsupportedInstructionError,
  );

  assertEquals(displayBuffer.width, widthBefore);
  assertEquals(displayBuffer.height, heightBefore);
  assertEquals(displayBuffer.getPixel(0, 0), true);
});

Deno.test("Classic CHIP-8 rejects SUPER-CHIP SCD 0 before display mutation", () => {
  const displayBuffer = new DisplayBuffer(
    CLASSIC_CHIP8_PROFILE.display.specification,
    CLASSIC_CHIP8_PROFILE.quirks.spriteOverflow,
  );

  displayBuffer.setPixel(0, 0, true);

  const context = createContext({ displayBuffer });
  const executor = createExecutor(CLASSIC_CHIP8_PROFILE.quirks);

  const widthBefore = displayBuffer.width;
  const heightBefore = displayBuffer.height;

  assertThrows(
    () =>
      executor.execute(
        {
          kind: "scroll-display-down",
          opcode: opcode(0x00c0),
          rows: 0,
        },
        context,
      ),
    UnsupportedInstructionError,
  );

  assertEquals(displayBuffer.width, widthBefore);
  assertEquals(displayBuffer.height, heightBefore);
  assertEquals(displayBuffer.getPixel(0, 0), true);
});

Deno.test("Classic CHIP-8 rejects SUPER-CHIP SCD 1 before display mutation", () => {
  const displayBuffer = new DisplayBuffer(
    CLASSIC_CHIP8_PROFILE.display.specification,
    CLASSIC_CHIP8_PROFILE.quirks.spriteOverflow,
  );

  displayBuffer.setPixel(0, 0, true);

  const context = createContext({ displayBuffer });
  const executor = createExecutor(CLASSIC_CHIP8_PROFILE.quirks);

  const widthBefore = displayBuffer.width;
  const heightBefore = displayBuffer.height;

  assertThrows(
    () =>
      executor.execute(
        {
          kind: "scroll-display-down",
          opcode: opcode(0x00c1),
          rows: 1,
        },
        context,
      ),
    UnsupportedInstructionError,
  );

  assertEquals(displayBuffer.width, widthBefore);
  assertEquals(displayBuffer.height, heightBefore);
  assertEquals(displayBuffer.getPixel(0, 0), true);
});

Deno.test("Classic CHIP-8 rejects SUPER-CHIP SCR before display mutation", () => {
  const displayBuffer = new DisplayBuffer(
    CLASSIC_CHIP8_PROFILE.display.specification,
    CLASSIC_CHIP8_PROFILE.quirks.spriteOverflow,
  );

  displayBuffer.setPixel(0, 0, true);

  const context = createContext({ displayBuffer });
  const executor = createExecutor(CLASSIC_CHIP8_PROFILE.quirks);

  const widthBefore = displayBuffer.width;
  const heightBefore = displayBuffer.height;

  assertThrows(
    () =>
      executor.execute(
        {
          kind: "scroll-display-horizontal",
          opcode: opcode(0x00fb),
          direction: "right",
          columns: 4,
        },
        context,
      ),
    UnsupportedInstructionError,
  );

  assertEquals(displayBuffer.width, widthBefore);
  assertEquals(displayBuffer.height, heightBefore);
  assertEquals(displayBuffer.getPixel(0, 0), true);
});

Deno.test("Classic CHIP-8 rejects SUPER-CHIP SCL before display mutation", () => {
  const displayBuffer = new DisplayBuffer(
    CLASSIC_CHIP8_PROFILE.display.specification,
    CLASSIC_CHIP8_PROFILE.quirks.spriteOverflow,
  );

  displayBuffer.setPixel(0, 0, true);

  const context = createContext({ displayBuffer });
  const executor = createExecutor(CLASSIC_CHIP8_PROFILE.quirks);

  const widthBefore = displayBuffer.width;
  const heightBefore = displayBuffer.height;

  assertThrows(
    () =>
      executor.execute(
        {
          kind: "scroll-display-horizontal",
          opcode: opcode(0x00fc),
          direction: "left",
          columns: 4,
        },
        context,
      ),
    UnsupportedInstructionError,
  );

  assertEquals(displayBuffer.width, widthBefore);
  assertEquals(displayBuffer.height, heightBefore);
  assertEquals(displayBuffer.getPixel(0, 0), true);
});

Deno.test("CHIP-48 rejects SUPER-CHIP LOW before display mutation", () => {
  const displayBuffer = new DisplayBuffer(
    CHIP48_PROFILE.display.specification,
    CHIP48_PROFILE.quirks.spriteOverflow,
  );

  displayBuffer.setPixel(0, 0, true);

  const context = createContext({ displayBuffer });
  const executor = createExecutor(CHIP48_PROFILE.quirks);

  const widthBefore = displayBuffer.width;
  const heightBefore = displayBuffer.height;

  assertThrows(
    () =>
      executor.execute(
        {
          kind: "set-display-mode",
          opcode: opcode(0x00fe),
          mode: "low",
        },
        context,
      ),
    UnsupportedInstructionError,
  );

  assertEquals(displayBuffer.width, widthBefore);
  assertEquals(displayBuffer.height, heightBefore);
  assertEquals(displayBuffer.getPixel(0, 0), true);
});

Deno.test("CHIP-48 rejects SUPER-CHIP HIGH before display mutation", () => {
  const displayBuffer = new DisplayBuffer(
    CHIP48_PROFILE.display.specification,
    CHIP48_PROFILE.quirks.spriteOverflow,
  );

  displayBuffer.setPixel(0, 0, true);

  const context = createContext({ displayBuffer });
  const executor = createExecutor(CHIP48_PROFILE.quirks);

  const widthBefore = displayBuffer.width;
  const heightBefore = displayBuffer.height;

  assertThrows(
    () =>
      executor.execute(
        {
          kind: "set-display-mode",
          opcode: opcode(0x00ff),
          mode: "high",
        },
        context,
      ),
    UnsupportedInstructionError,
  );

  assertEquals(displayBuffer.width, widthBefore);
  assertEquals(displayBuffer.height, heightBefore);
  assertEquals(displayBuffer.getPixel(0, 0), true);
});

Deno.test("CHIP-48 rejects SUPER-CHIP SCD 0 before display mutation", () => {
  const displayBuffer = new DisplayBuffer(
    CHIP48_PROFILE.display.specification,
    CHIP48_PROFILE.quirks.spriteOverflow,
  );

  displayBuffer.setPixel(0, 0, true);

  const context = createContext({ displayBuffer });
  const executor = createExecutor(CHIP48_PROFILE.quirks);

  const widthBefore = displayBuffer.width;
  const heightBefore = displayBuffer.height;

  assertThrows(
    () =>
      executor.execute(
        {
          kind: "scroll-display-down",
          opcode: opcode(0x00c0),
          rows: 0,
        },
        context,
      ),
    UnsupportedInstructionError,
  );

  assertEquals(displayBuffer.width, widthBefore);
  assertEquals(displayBuffer.height, heightBefore);
  assertEquals(displayBuffer.getPixel(0, 0), true);
});

Deno.test("CHIP-48 rejects SUPER-CHIP SCD 1 before display mutation", () => {
  const displayBuffer = new DisplayBuffer(
    CHIP48_PROFILE.display.specification,
    CHIP48_PROFILE.quirks.spriteOverflow,
  );

  displayBuffer.setPixel(0, 0, true);

  const context = createContext({ displayBuffer });
  const executor = createExecutor(CHIP48_PROFILE.quirks);

  const widthBefore = displayBuffer.width;
  const heightBefore = displayBuffer.height;

  assertThrows(
    () =>
      executor.execute(
        {
          kind: "scroll-display-down",
          opcode: opcode(0x00c1),
          rows: 1,
        },
        context,
      ),
    UnsupportedInstructionError,
  );

  assertEquals(displayBuffer.width, widthBefore);
  assertEquals(displayBuffer.height, heightBefore);
  assertEquals(displayBuffer.getPixel(0, 0), true);
});

Deno.test("CHIP-48 rejects SUPER-CHIP SCR before display mutation", () => {
  const displayBuffer = new DisplayBuffer(
    CHIP48_PROFILE.display.specification,
    CHIP48_PROFILE.quirks.spriteOverflow,
  );

  displayBuffer.setPixel(0, 0, true);

  const context = createContext({ displayBuffer });
  const executor = createExecutor(CHIP48_PROFILE.quirks);

  const widthBefore = displayBuffer.width;
  const heightBefore = displayBuffer.height;

  assertThrows(
    () =>
      executor.execute(
        {
          kind: "scroll-display-horizontal",
          opcode: opcode(0x00fb),
          direction: "right",
          columns: 4,
        },
        context,
      ),
    UnsupportedInstructionError,
  );

  assertEquals(displayBuffer.width, widthBefore);
  assertEquals(displayBuffer.height, heightBefore);
  assertEquals(displayBuffer.getPixel(0, 0), true);
});

Deno.test("CHIP-48 rejects SUPER-CHIP SCL before display mutation", () => {
  const displayBuffer = new DisplayBuffer(
    CHIP48_PROFILE.display.specification,
    CHIP48_PROFILE.quirks.spriteOverflow,
  );

  displayBuffer.setPixel(0, 0, true);

  const context = createContext({ displayBuffer });
  const executor = createExecutor(CHIP48_PROFILE.quirks);

  const widthBefore = displayBuffer.width;
  const heightBefore = displayBuffer.height;

  assertThrows(
    () =>
      executor.execute(
        {
          kind: "scroll-display-horizontal",
          opcode: opcode(0x00fc),
          direction: "left",
          columns: 4,
        },
        context,
      ),
    UnsupportedInstructionError,
  );

  assertEquals(displayBuffer.width, widthBefore);
  assertEquals(displayBuffer.height, heightBefore);
  assertEquals(displayBuffer.getPixel(0, 0), true);
});

Deno.test("sets I to the large-font sprite address for Vx", () => {
  const context = createContext({
    font: new SuperChipFont(address(0x050), address(0x0a0)),
  });

  context.registers.set(registerIndex(0x3), byte(0x04));

  const executor = createExecutor(SUPERCHIP_PROFILE.quirks, SUPERCHIP_PROFILE.instructionSet);
  executor.execute(
    {
      kind: "set-index-to-large-sprite",
      opcode: opcode(0xf330),
      register: registerIndex(0x3),
    },
    context,
  );

  assertEquals(context.indexRegister.getValue(), address(0x0c8));
});

Deno.test("stores V0 through Vx in RPL flags", () => {
  const context = createContext();

  context.registers.set(registerIndex(0), byte(0x11));
  context.registers.set(registerIndex(1), byte(0x22));
  context.registers.set(registerIndex(2), byte(0x33));

  context.rplFlags.set(registerIndex(3), byte(0xee));

  const executor = createExecutor(SUPERCHIP_PROFILE.quirks, SUPERCHIP_PROFILE.instructionSet);

  executor.execute(
    {
      kind: "store-rpl-flags",
      opcode: opcode(0xf275),
      register: registerIndex(2),
    },
    context,
  );

  assertEquals(context.rplFlags.get(registerIndex(0)), byte(0x11));
  assertEquals(context.rplFlags.get(registerIndex(1)), byte(0x22));
  assertEquals(context.rplFlags.get(registerIndex(2)), byte(0x33));
  assertEquals(context.rplFlags.get(registerIndex(3)), byte(0xee));
});

Deno.test("loads V0 through Vx from RPL flags", () => {
  const context = createContext();

  context.rplFlags.set(registerIndex(0), byte(0x44));
  context.rplFlags.set(registerIndex(1), byte(0x55));
  context.rplFlags.set(registerIndex(2), byte(0x66));

  context.registers.set(registerIndex(3), byte(0xee));

  const executor = createExecutor(SUPERCHIP_PROFILE.quirks, SUPERCHIP_PROFILE.instructionSet);

  executor.execute(
    {
      kind: "load-rpl-flags",
      opcode: opcode(0xf285),
      register: registerIndex(2),
    },
    context,
  );

  assertEquals(context.registers.get(registerIndex(0)), byte(0x44));
  assertEquals(context.registers.get(registerIndex(1)), byte(0x55));
  assertEquals(context.registers.get(registerIndex(2)), byte(0x66));
  assertEquals(context.registers.get(registerIndex(3)), byte(0xee));
});

Deno.test("Classic CHIP-8 rejects SUPER-CHIP Fx30 before changing I", () => {
  const context = createContext();

  context.indexRegister.setValue(address(0x345));
  context.registers.set(registerIndex(0x3), byte(0x04));

  const executor = createExecutor(CLASSIC_CHIP8_PROFILE.quirks);

  const instruction: Instruction = {
    kind: "set-index-to-large-sprite",
    opcode: opcode(0xf330),
    register: registerIndex(0x3),
  };

  assertThrows(() => executor.execute(instruction, context), UnsupportedInstructionError);

  assertEquals(context.indexRegister.getValue(), address(0x345));
});

Deno.test("CHIP-48 rejects SUPER-CHIP Fx30 before changing I", () => {
  const context = createContext();

  context.indexRegister.setValue(address(0x345));
  context.registers.set(registerIndex(0x3), byte(0x04));

  const executor = createExecutor(CHIP48_PROFILE.quirks);

  const instruction: Instruction = {
    kind: "set-index-to-large-sprite",
    opcode: opcode(0xf330),
    register: registerIndex(0x3),
  };

  assertThrows(() => executor.execute(instruction, context), UnsupportedInstructionError);

  assertEquals(context.indexRegister.getValue(), address(0x345));
});

Deno.test("Classic CHIP-8 does not acquire SUPER-CHIP Dxy0 semantics from the display", () => {
  const registers = new Registers();

  registers.set(registerIndex(0xa), byte(0x00));
  registers.set(registerIndex(0xb), byte(0x00));
  registers.set(FLAG_REGISTER, byte(0x01));

  const memory = new Ram(0x1000);

  /*
   * If SUPER-CHIP Dxy0 semantics leak through the display capability,
   * this byte would draw the first pixel of an extended sprite.
   */
  memory.write(address(0x300), byte(0b1000_0000));

  const displayBuffer = new DisplayBuffer(
    SUPERCHIP_PROFILE.display.specification,
    SUPERCHIP_PROFILE.quirks.spriteOverflow,
  );

  const verticalBlank = new VerticalBlank();
  verticalBlank.signal();

  const context = createContext({
    registers,
    memory,
    indexRegister: new IndexRegister(address(0x300)),
    displayBuffer,
    verticalBlank,
  });

  const executor = createExecutor(CLASSIC_CHIP8_PROFILE.quirks);

  executor.execute(
    {
      kind: "draw-sprite",
      opcode: opcode(0xdab0),
      x: registerIndex(0xa),
      y: registerIndex(0xb),
      height: 0,
    },
    context,
  );

  assertEquals(displayBuffer.getPixel(0, 0), false);
  assertEquals(registers.get(FLAG_REGISTER), byte(0));
});

Deno.test(
  "Classic CHIP-8 does not acquire SUPER-CHIP draw VF semantics from high-resolution display mode",
  () => {
    const registers = new Registers();

    registers.set(registerIndex(0xa), byte(0x00));
    registers.set(registerIndex(0xb), byte(0x00));

    const memory = new Ram(0x1000);

    /*
     * Two sprite rows collide independently.
     *
     * SUPER-CHIP high-resolution semantics would report two affected rows
     * in VF, while Classic CHIP-8 semantics must report collision as a
     * boolean value of 1.
     */
    memory.write(address(0x300), byte(0b1000_0000));
    memory.write(address(0x301), byte(0b1000_0000));

    const displayBuffer = new DisplayBuffer(
      SUPERCHIP_PROFILE.display.specification,
      SUPERCHIP_PROFILE.quirks.spriteOverflow,
    );

    displayBuffer.setMode("high");

    displayBuffer.setPixel(0, 0, true);
    displayBuffer.setPixel(0, 1, true);

    const verticalBlank = new VerticalBlank();
    verticalBlank.signal();

    const context = createContext({
      registers,
      memory,
      indexRegister: new IndexRegister(address(0x300)),
      displayBuffer,
      verticalBlank,
    });

    const executor = createExecutor(CLASSIC_CHIP8_PROFILE.quirks);

    executor.execute(
      {
        kind: "draw-sprite",
        opcode: opcode(0xdab2),
        x: registerIndex(0xa),
        y: registerIndex(0xb),
        height: 2,
      },
      context,
    );

    assertEquals(registers.get(FLAG_REGISTER), byte(1));
  },
);

Deno.test("CHIP-48 does not acquire SUPER-CHIP Dxy0 semantics from the display", () => {
  const registers = new Registers();

  registers.set(registerIndex(0xa), byte(0x00));
  registers.set(registerIndex(0xb), byte(0x00));
  registers.set(FLAG_REGISTER, byte(0x01));

  const memory = new Ram(0x1000);

  memory.write(address(0x300), byte(0b1000_0000));

  const displayBuffer = new DisplayBuffer(
    SUPERCHIP_PROFILE.display.specification,
    SUPERCHIP_PROFILE.quirks.spriteOverflow,
  );

  const verticalBlank = new VerticalBlank();
  verticalBlank.signal();

  const context = createContext({
    registers,
    memory,
    indexRegister: new IndexRegister(address(0x300)),
    displayBuffer,
    verticalBlank,
  });

  const executor = createExecutor(CHIP48_PROFILE.quirks);

  executor.execute(
    {
      kind: "draw-sprite",
      opcode: opcode(0xdab0),
      x: registerIndex(0xa),
      y: registerIndex(0xb),
      height: 0,
    },
    context,
  );

  assertEquals(displayBuffer.getPixel(0, 0), false);
  assertEquals(registers.get(FLAG_REGISTER), byte(0));
});

Deno.test(
  "CHIP-48 does not acquire SUPER-CHIP draw VF semantics from high-resolution display mode",
  () => {
    const registers = new Registers();

    registers.set(registerIndex(0xa), byte(0x00));
    registers.set(registerIndex(0xb), byte(0x00));

    const memory = new Ram(0x1000);

    memory.write(address(0x300), byte(0b1000_0000));
    memory.write(address(0x301), byte(0b1000_0000));

    const displayBuffer = new DisplayBuffer(
      SUPERCHIP_PROFILE.display.specification,
      SUPERCHIP_PROFILE.quirks.spriteOverflow,
    );

    displayBuffer.setMode("high");

    displayBuffer.setPixel(0, 0, true);
    displayBuffer.setPixel(0, 1, true);

    const verticalBlank = new VerticalBlank();
    verticalBlank.signal();

    const context = createContext({
      registers,
      memory,
      indexRegister: new IndexRegister(address(0x300)),
      displayBuffer,
      verticalBlank,
    });

    const executor = createExecutor(CHIP48_PROFILE.quirks);

    executor.execute(
      {
        kind: "draw-sprite",
        opcode: opcode(0xdab2),
        x: registerIndex(0xa),
        y: registerIndex(0xb),
        height: 2,
      },
      context,
    );

    assertEquals(registers.get(FLAG_REGISTER), byte(1));
  },
);
