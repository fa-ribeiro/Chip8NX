import { assertEquals, assertThrows } from "@std/assert";

import { address } from "../core/types/address.ts";
import { type Byte, byte } from "../core/types/byte.ts";
import { opcode } from "../core/types/opcode.ts";
import { key } from "../core/types/key.ts";
import { DisplayBuffer } from "../display/display-buffer.ts";
import { ClassicFont } from "../font/classic-font.ts";
import type { Font } from "../font/font.ts";
import type { Instruction } from "../instruction/instruction.ts";
import { Ram } from "../memory/ram.ts";
import { Timer } from "../timer/timer.ts";
import { IndexRegister } from "./index-register/index-register.ts";
import type { ExecutionContext } from "./execution-context.ts";
import { FLAG_REGISTER, InstructionExecutor, UnsupportedInstructionError } from "./instruction-executor.ts";
import { ProgramCounter } from "./program-counter/program-counter.ts";
import { registerIndex } from "./registers/register-index.ts";
import { Registers } from "./registers/registers.ts";
import { Stack } from "./stack/stack.ts";
import { TestRandomNumberGenerator } from "../random/test-random-number-generator.ts";
import { TestKeyboard } from "../keyboard/test-keyboard.ts";

function createContext(overrides: Partial<ExecutionContext> = {}): ExecutionContext {
  return {
    registers: new Registers(),
    memory: new Ram(0x1000),
    stack: new Stack(),
    programCounter: new ProgramCounter(),
    indexRegister: new IndexRegister(),
    soundTimer: new Timer(),
    delayTimer: new Timer(),
    displayBuffer: new DisplayBuffer(64, 32),
    keyboard: new TestKeyboard(),
    font: new ClassicFont(),
    randomNumberGenerator: new TestRandomNumberGenerator([byte(0x00)]),
    ...overrides,
  };
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
  const displayBuffer = new DisplayBuffer(64, 32);
  displayBuffer.setPixel(10, 20, true);

  const context = createContext({ displayBuffer });
  const executor = new InstructionExecutor();

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
  const executor = new InstructionExecutor();

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
  const stack = new Stack();
  const context = createContext({ programCounter, stack });
  const executor = new InstructionExecutor();

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
  const stack = new Stack();
  stack.push(address(0x202));

  const context = createContext({ programCounter, stack });
  const executor = new InstructionExecutor();

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
  const executor = new InstructionExecutor();

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
  const executor = new InstructionExecutor();

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
  const executor = new InstructionExecutor();

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
  const executor = new InstructionExecutor();

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
  const executor = new InstructionExecutor();

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
  const executor = new InstructionExecutor();

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
  const executor = new InstructionExecutor();

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
  const executor = new InstructionExecutor();

  executor.execute(registerOperation("assign", 0xa, 0xb, 0x8ab0), context);

  assertEquals(registers.get(registerIndex(0xa)), byte(0xab));
});

Deno.test("OR Vx, Vy performs a bitwise OR", () => {
  const registers = new Registers();
  registers.set(registerIndex(0xa), byte(0b1010_0000));
  registers.set(registerIndex(0xb), byte(0b0000_1111));

  const context = createContext({ registers });
  const executor = new InstructionExecutor();

  executor.execute(registerOperation("or", 0xa, 0xb, 0x8ab1), context);

  assertEquals(registers.get(registerIndex(0xa)), byte(0b1010_1111));
});

Deno.test("AND Vx, Vy performs a bitwise AND", () => {
  const registers = new Registers();
  registers.set(registerIndex(0xa), byte(0b1010_1010));
  registers.set(registerIndex(0xb), byte(0b1111_0000));

  const context = createContext({ registers });
  const executor = new InstructionExecutor();

  executor.execute(registerOperation("and", 0xa, 0xb, 0x8ab2), context);

  assertEquals(registers.get(registerIndex(0xa)), byte(0b1010_0000));
});

Deno.test("XOR Vx, Vy performs a bitwise XOR", () => {
  const registers = new Registers();
  registers.set(registerIndex(0xa), byte(0b1010_1010));
  registers.set(registerIndex(0xb), byte(0b1111_0000));

  const context = createContext({ registers });
  const executor = new InstructionExecutor();

  executor.execute(registerOperation("xor", 0xa, 0xb, 0x8ab3), context);

  assertEquals(registers.get(registerIndex(0xa)), byte(0b0101_1010));
});

Deno.test("ADD Vx, Vy stores the wrapped result and carry in VF", () => {
  const registers = new Registers();
  registers.set(registerIndex(0xa), byte(0xff));
  registers.set(registerIndex(0xb), byte(0x01));

  const context = createContext({ registers });
  const executor = new InstructionExecutor();

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
  const executor = new InstructionExecutor();

  executor.execute(registerOperation("add", 0xa, 0xb, 0x8ab4), context);

  assertEquals(registers.get(registerIndex(0xa)), byte(0x46));
  assertEquals(registers.get(FLAG_REGISTER), byte(0x00));
});

Deno.test("SUB Vx, Vy stores the result and sets VF when no borrow occurs", () => {
  const registers = new Registers();
  registers.set(registerIndex(0xa), byte(0x05));
  registers.set(registerIndex(0xb), byte(0x03));

  const context = createContext({ registers });
  const executor = new InstructionExecutor();

  executor.execute(registerOperation("subtract", 0xa, 0xb, 0x8ab5), context);

  assertEquals(registers.get(registerIndex(0xa)), byte(0x02));
  assertEquals(registers.get(FLAG_REGISTER), byte(0x01));
});

Deno.test("SUB Vx, Vy wraps and clears VF when a borrow occurs", () => {
  const registers = new Registers();
  registers.set(registerIndex(0xa), byte(0x03));
  registers.set(registerIndex(0xb), byte(0x05));

  const context = createContext({ registers });
  const executor = new InstructionExecutor();

  executor.execute(registerOperation("subtract", 0xa, 0xb, 0x8ab5), context);

  assertEquals(registers.get(registerIndex(0xa)), byte(0xfe));
  assertEquals(registers.get(FLAG_REGISTER), byte(0x00));
});

Deno.test("SHR Vx shifts right and stores the old LSB in VF", () => {
  const registers = new Registers();
  registers.set(registerIndex(0xa), byte(0b0000_0011));
  registers.set(registerIndex(0xb), byte(0b0000_0010));

  const context = createContext({ registers });
  const executor = new InstructionExecutor();

  executor.execute(registerOperation("shift-right", 0xa, 0x0, 0x8ab6), context);

  assertEquals(registers.get(registerIndex(0xa)), byte(0b0000_0001));
  assertEquals(registers.get(FLAG_REGISTER), byte(0x01));

  executor.execute(registerOperation("shift-right", 0xb, 0x0, 0x8ab6), context);

  assertEquals(registers.get(registerIndex(0xb)), byte(0b0000_0001));
  assertEquals(registers.get(FLAG_REGISTER), byte(0x0));
});

Deno.test("SUBN Vx, Vy computes Vy minus Vx", () => {
  const registers = new Registers();
  registers.set(registerIndex(0xa), byte(0x03));
  registers.set(registerIndex(0xb), byte(0x05));

  const context = createContext({ registers });
  const executor = new InstructionExecutor();

  executor.execute(registerOperation("reverse-subtract", 0xa, 0xb, 0x8ab7), context);

  assertEquals(registers.get(registerIndex(0xa)), byte(0x02));
  assertEquals(registers.get(FLAG_REGISTER), byte(0x01));
});

Deno.test("SUBN Vx, Vy computes Vy minus Vx and wraps when a borrow occurs", () => {
  const registers = new Registers();
  registers.set(registerIndex(0xa), byte(0x05));
  registers.set(registerIndex(0xb), byte(0x03));

  const context = createContext({ registers });
  const executor = new InstructionExecutor();
  executor.execute(registerOperation("reverse-subtract", 0xa, 0xb, 0x8ab7), context);

  assertEquals(registers.get(registerIndex(0xa)), byte(0xfe));
  assertEquals(registers.get(FLAG_REGISTER), byte(0x00));
});

Deno.test("SHL Vx shifts left and stores the old MSB in VF", () => {
  const registers = new Registers();
  registers.set(registerIndex(0xa), byte(0b1000_0001));
  registers.set(registerIndex(0xb), byte(0b0100_0001));

  const context = createContext({ registers });
  const executor = new InstructionExecutor();

  executor.execute(registerOperation("shift-left", 0xa, 0x0, 0x8abe), context);

  assertEquals(registers.get(registerIndex(0xa)), byte(0b0000_0010));
  assertEquals(registers.get(FLAG_REGISTER), byte(0x01));

  executor.execute(registerOperation("shift-left", 0xb, 0x0, 0x8abe), context);

  assertEquals(registers.get(registerIndex(0xb)), byte(0b1000_0010));
  assertEquals(registers.get(FLAG_REGISTER), byte(0x00));
});

Deno.test("logical register operations do not modify VF", () => {
  const registers = new Registers();
  registers.set(registerIndex(0xa), byte(0xf0));
  registers.set(registerIndex(0xb), byte(0x0f));
  registers.set(FLAG_REGISTER, byte(0x01));

  const context = createContext({ registers });
  const executor = new InstructionExecutor();

  executor.execute(registerOperation("xor", 0xa, 0xb, 0x8ab3), context);

  assertEquals(registers.get(FLAG_REGISTER), byte(0x01));
});

Deno.test("unsupported instructions throw UnsupportedInstructionError", () => {
  const context = createContext();
  const executor = new InstructionExecutor();
  const instruction: Instruction = {
    kind: "system-call",
    opcode: opcode(0x0123),
    address: address(0x123),
  };

  const error = assertThrows(() => executor.execute(instruction, context), UnsupportedInstructionError);

  assertEquals(error.instruction, instruction);
});

Deno.test("DRW draws the sprite stored at I", () => {
  const registers = new Registers();
  registers.set(registerIndex(0xa), byte(0x02));
  registers.set(registerIndex(0xb), byte(0x03));

  const memory = new Ram(0x1000);
  memory.write(address(0x300), byte(0b1010_0000));

  const indexRegister = new IndexRegister(address(0x300));
  const displayBuffer = new DisplayBuffer(8, 8);

  const context = createContext({
    registers,
    memory,
    indexRegister,
    displayBuffer,
  });

  const executor = new InstructionExecutor();

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
  const displayBuffer = new DisplayBuffer(8, 8);

  displayBuffer.setPixel(0, 0, true);

  const context = createContext({
    registers,
    memory,
    indexRegister,
    displayBuffer,
  });

  const executor = new InstructionExecutor();

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
  const displayBuffer = new DisplayBuffer(8, 8);

  const context = createContext({
    registers,
    memory,
    indexRegister,
    displayBuffer,
  });

  const executor = new InstructionExecutor();

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

Deno.test("LD I, addr stores the address in the index register", () => {
  const indexRegister = new IndexRegister();
  const context = createContext({ indexRegister });
  const executor = new InstructionExecutor();

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
  const executor = new InstructionExecutor();

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

  const executor = new InstructionExecutor();

  executor.execute(
    {
      kind: "jump-with-offset",
      opcode: opcode(0xb300),
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

  const executor = new InstructionExecutor();

  executor.execute(
    {
      kind: "jump-with-offset",
      opcode: opcode(0xba00),
      address: address(0xa00),
    },
    context,
  );

  assertEquals(programCounter.getValue(), address(0xa07));
});

Deno.test("RND Vx, byte stores random byte AND mask", () => {
  const registers = new Registers();

  const randomNumberGenerator = new TestRandomNumberGenerator([byte(0b1010_1010)]);

  const context = createContext({
    registers,
    randomNumberGenerator,
  });

  const executor = new InstructionExecutor();

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

  const executor = new InstructionExecutor();

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

  const executor = new InstructionExecutor();

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
  const keyboard = new TestKeyboard();

  registers.set(registerIndex(0xa), byte(0x5));
  keyboard.press(key(0x5));

  const context = createContext({
    registers,
    programCounter,
    keyboard,
  });

  const executor = new InstructionExecutor();

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
  const keyboard = new TestKeyboard();

  registers.set(registerIndex(0xa), byte(0x5));

  const context = createContext({
    registers,
    programCounter,
    keyboard,
  });

  const executor = new InstructionExecutor();

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
  const keyboard = new TestKeyboard();

  registers.set(registerIndex(0xa), byte(0xab));
  keyboard.press(key(0xb));

  const context = createContext({
    registers,
    programCounter,
    keyboard,
  });

  const executor = new InstructionExecutor();

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
  const keyboard = new TestKeyboard();

  registers.set(registerIndex(0xa), byte(0x5));

  const context = createContext({
    registers,
    programCounter,
    keyboard,
  });

  const executor = new InstructionExecutor();

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
  const keyboard = new TestKeyboard();

  registers.set(registerIndex(0xa), byte(0x5));
  keyboard.press(key(0x5));

  const context = createContext({
    registers,
    programCounter,
    keyboard,
  });

  const executor = new InstructionExecutor();

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
  const keyboard = new TestKeyboard();

  registers.set(registerIndex(0xa), byte(0xab));
  keyboard.press(key(0xb));

  const context = createContext({
    registers,
    programCounter,
    keyboard,
  });

  const executor = new InstructionExecutor();

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

  const executor = new InstructionExecutor();

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

  const executor = new InstructionExecutor();

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

  const executor = new InstructionExecutor();

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

  const executor = new InstructionExecutor();

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

  const executor = new InstructionExecutor();

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

  const executor = new InstructionExecutor();

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

Deno.test("LD F, Vx resolves Vx through the configured font and stores the address in I", () => {
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

  const executor = new InstructionExecutor();

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
});

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

  const executor = new InstructionExecutor();

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

  const executor = new InstructionExecutor();

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

  const executor = new InstructionExecutor();

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

  const executor = new InstructionExecutor();

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

  const executor = new InstructionExecutor();

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

  const executor = new InstructionExecutor();

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

  const executor = new InstructionExecutor();

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

  const executor = new InstructionExecutor();

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

  const executor = new InstructionExecutor();

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

Deno.test("LD Vx, K repeats the instruction while waiting for a key release", () => {
  const registers = new Registers();
  const keyboard = new TestKeyboard();
  const programCounter = new ProgramCounter(address(0x302));

  registers.set(registerIndex(0xa), byte(0x42));

  const context = createContext({
    registers,
    keyboard,
    programCounter,
  });

  const executor = new InstructionExecutor();

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
  const keyboard = new TestKeyboard();
  const programCounter = new ProgramCounter(address(0x302));

  const context = createContext({
    registers,
    keyboard,
    programCounter,
  });

  const executor = new InstructionExecutor();

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
