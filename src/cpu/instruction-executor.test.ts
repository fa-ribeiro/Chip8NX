import { assertEquals, assertThrows } from "@std/assert";

import { address } from "../core/types/address.ts";
import { byte } from "../core/types/byte.ts";
import { opcode } from "../core/types/opcode.ts";
import { DisplayBuffer } from "../display/display-buffer.ts";
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

function createContext(
  overrides: Partial<ExecutionContext> = {},
): ExecutionContext {
  return {
    registers: new Registers(),
    memory: new Ram(0x1000),
    stack: new Stack(),
    programCounter: new ProgramCounter(),
    indexRegister: new IndexRegister(),
    soundTimer: new Timer(),
    delayTimer: new Timer(),
    displayBuffer: new DisplayBuffer(64, 32),
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
      opcode: opcode(0x00E0),
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
      opcode: opcode(0x00EE),
    },
    context,
  );

  assertEquals(programCounter.getValue(), address(0x202));
  assertEquals(stack.isEmpty(), true);
});

Deno.test("SE Vx, NN skips when the values are equal", () => {
  const registers = new Registers();
  const programCounter = new ProgramCounter(address(0x202));
  registers.set(registerIndex(0xA), byte(0x42));

  const context = createContext({ registers, programCounter });
  const executor = new InstructionExecutor();

  executor.execute(
    {
      kind: "skip-equal-immediate",
      opcode: opcode(0x3A42),
      register: registerIndex(0xA),
      value: byte(0x42),
    },
    context,
  );

  assertEquals(programCounter.getValue(), address(0x204));
});

Deno.test("SE Vx, NN does not skip when the values differ", () => {
  const registers = new Registers();
  const programCounter = new ProgramCounter(address(0x202));
  registers.set(registerIndex(0xA), byte(0x41));

  const context = createContext({ registers, programCounter });
  const executor = new InstructionExecutor();

  executor.execute(
    {
      kind: "skip-equal-immediate",
      opcode: opcode(0x3A42),
      register: registerIndex(0xA),
      value: byte(0x42),
    },
    context,
  );

  assertEquals(programCounter.getValue(), address(0x202));
});

Deno.test("SNE Vx, NN skips when the values differ", () => {
  const registers = new Registers();
  const programCounter = new ProgramCounter(address(0x202));
  registers.set(registerIndex(0xA), byte(0x41));

  const context = createContext({ registers, programCounter });
  const executor = new InstructionExecutor();

  executor.execute(
    {
      kind: "skip-not-equal-immediate",
      opcode: opcode(0x4A42),
      register: registerIndex(0xA),
      value: byte(0x42),
    },
    context,
  );

  assertEquals(programCounter.getValue(), address(0x204));
});

Deno.test("SE Vx, Vy skips when the registers are equal", () => {
  const registers = new Registers();
  const programCounter = new ProgramCounter(address(0x202));
  registers.set(registerIndex(0xA), byte(0x42));
  registers.set(registerIndex(0xB), byte(0x42));

  const context = createContext({ registers, programCounter });
  const executor = new InstructionExecutor();

  executor.execute(
    {
      kind: "skip-equal-register",
      opcode: opcode(0x5AB0),
      x: registerIndex(0xA),
      y: registerIndex(0xB),
    },
    context,
  );

  assertEquals(programCounter.getValue(), address(0x204));
});

Deno.test("SNE Vx, Vy skips when the registers differ", () => {
  const registers = new Registers();
  const programCounter = new ProgramCounter(address(0x202));
  registers.set(registerIndex(0xA), byte(0x42));
  registers.set(registerIndex(0xB), byte(0x43));

  const context = createContext({ registers, programCounter });
  const executor = new InstructionExecutor();

  executor.execute(
    {
      kind: "skip-not-equal-register",
      opcode: opcode(0x9AB0),
      x: registerIndex(0xA),
      y: registerIndex(0xB),
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
      opcode: opcode(0x6A42),
      register: registerIndex(0xA),
      value: byte(0x42),
    },
    context,
  );

  assertEquals(registers.get(registerIndex(0xA)), byte(0x42));
});

Deno.test("ADD Vx, NN wraps at 0xFF without changing VF", () => {
  const registers = new Registers();
  registers.set(registerIndex(0xA), byte(0xFF));
  registers.set(FLAG_REGISTER, byte(0x7F));

  const context = createContext({ registers });
  const executor = new InstructionExecutor();

  executor.execute(
    {
      kind: "add-immediate",
      opcode: opcode(0x7AFF),
      register: registerIndex(0xA),
      value: byte(0xFF),
    },
    context,
  );

  assertEquals(registers.get(registerIndex(0xA)), byte(0xFE));
  assertEquals(registers.get(FLAG_REGISTER), byte(0x7F));
});

Deno.test("LD Vx, Vy copies the source register", () => {
  const registers = new Registers();
  registers.set(registerIndex(0xA), byte(0x12));
  registers.set(registerIndex(0xB), byte(0xAB));

  const context = createContext({ registers });
  const executor = new InstructionExecutor();

  executor.execute(
    registerOperation("assign", 0xA, 0xB, 0x8AB0),
    context,
  );

  assertEquals(registers.get(registerIndex(0xA)), byte(0xAB));
});

Deno.test("OR Vx, Vy performs a bitwise OR", () => {
  const registers = new Registers();
  registers.set(registerIndex(0xA), byte(0b1010_0000));
  registers.set(registerIndex(0xB), byte(0b0000_1111));

  const context = createContext({ registers });
  const executor = new InstructionExecutor();

  executor.execute(
    registerOperation("or", 0xA, 0xB, 0x8AB1),
    context,
  );

  assertEquals(registers.get(registerIndex(0xA)), byte(0b1010_1111));
});

Deno.test("AND Vx, Vy performs a bitwise AND", () => {
  const registers = new Registers();
  registers.set(registerIndex(0xA), byte(0b1010_1010));
  registers.set(registerIndex(0xB), byte(0b1111_0000));

  const context = createContext({ registers });
  const executor = new InstructionExecutor();

  executor.execute(
    registerOperation("and", 0xA, 0xB, 0x8AB2),
    context,
  );

  assertEquals(registers.get(registerIndex(0xA)), byte(0b1010_0000));
});

Deno.test("XOR Vx, Vy performs a bitwise XOR", () => {
  const registers = new Registers();
  registers.set(registerIndex(0xA), byte(0b1010_1010));
  registers.set(registerIndex(0xB), byte(0b1111_0000));

  const context = createContext({ registers });
  const executor = new InstructionExecutor();

  executor.execute(
    registerOperation("xor", 0xA, 0xB, 0x8AB3),
    context,
  );

  assertEquals(registers.get(registerIndex(0xA)), byte(0b0101_1010));
});

Deno.test("ADD Vx, Vy stores the wrapped result and carry in VF", () => {
  const registers = new Registers();
  registers.set(registerIndex(0xA), byte(0xFF));
  registers.set(registerIndex(0xB), byte(0x01));

  const context = createContext({ registers });
  const executor = new InstructionExecutor();

  executor.execute(
    registerOperation("add", 0xA, 0xB, 0x8AB4),
    context,
  );

  assertEquals(registers.get(registerIndex(0xA)), byte(0x00));
  assertEquals(registers.get(FLAG_REGISTER), byte(0x01));
});

Deno.test("ADD Vx, Vy clears VF when there is no carry", () => {
  const registers = new Registers();
  registers.set(registerIndex(0xA), byte(0x12));
  registers.set(registerIndex(0xB), byte(0x34));
  registers.set(FLAG_REGISTER, byte(0xFF));

  const context = createContext({ registers });
  const executor = new InstructionExecutor();

  executor.execute(
    registerOperation("add", 0xA, 0xB, 0x8AB4),
    context,
  );

  assertEquals(registers.get(registerIndex(0xA)), byte(0x46));
  assertEquals(registers.get(FLAG_REGISTER), byte(0x00));
});

Deno.test("SUB Vx, Vy stores the result and sets VF when no borrow occurs", () => {
  const registers = new Registers();
  registers.set(registerIndex(0xA), byte(0x05));
  registers.set(registerIndex(0xB), byte(0x03));

  const context = createContext({ registers });
  const executor = new InstructionExecutor();

  executor.execute(
    registerOperation("subtract", 0xA, 0xB, 0x8AB5),
    context,
  );

  assertEquals(registers.get(registerIndex(0xA)), byte(0x02));
  assertEquals(registers.get(FLAG_REGISTER), byte(0x01));
});

Deno.test("SUB Vx, Vy wraps and clears VF when a borrow occurs", () => {
  const registers = new Registers();
  registers.set(registerIndex(0xA), byte(0x03));
  registers.set(registerIndex(0xB), byte(0x05));

  const context = createContext({ registers });
  const executor = new InstructionExecutor();

  executor.execute(
    registerOperation("subtract", 0xA, 0xB, 0x8AB5),
    context,
  );

  assertEquals(registers.get(registerIndex(0xA)), byte(0xFE));
  assertEquals(registers.get(FLAG_REGISTER), byte(0x00));
});

Deno.test("SHR Vx shifts right and stores the old LSB in VF", () => {
  const registers = new Registers();
  registers.set(registerIndex(0xA), byte(0b0000_0011));

  const context = createContext({ registers });
  const executor = new InstructionExecutor();

  executor.execute(
    registerOperation("shift-right", 0xA, 0xB, 0x8AB6),
    context,
  );

  assertEquals(registers.get(registerIndex(0xA)), byte(0b0000_0001));
  assertEquals(registers.get(FLAG_REGISTER), byte(0x01));
});

Deno.test("SUBN Vx, Vy computes Vy minus Vx", () => {
  const registers = new Registers();
  registers.set(registerIndex(0xA), byte(0x03));
  registers.set(registerIndex(0xB), byte(0x05));

  const context = createContext({ registers });
  const executor = new InstructionExecutor();

  executor.execute(
    registerOperation("reverse-subtract", 0xA, 0xB, 0x8AB7),
    context,
  );

  assertEquals(registers.get(registerIndex(0xA)), byte(0x02));
  assertEquals(registers.get(FLAG_REGISTER), byte(0x01));
});

Deno.test("SHL Vx shifts left and stores the old MSB in VF", () => {
  const registers = new Registers();
  registers.set(registerIndex(0xA), byte(0b1000_0001));

  const context = createContext({ registers });
  const executor = new InstructionExecutor();

  executor.execute(
    registerOperation("shift-left", 0xA, 0xB, 0x8ABE),
    context,
  );

  assertEquals(registers.get(registerIndex(0xA)), byte(0b0000_0010));
  assertEquals(registers.get(FLAG_REGISTER), byte(0x01));
});

Deno.test("logical register operations do not modify VF", () => {
  const registers = new Registers();
  registers.set(registerIndex(0xA), byte(0xF0));
  registers.set(registerIndex(0xB), byte(0x0F));
  registers.set(FLAG_REGISTER, byte(0x01));

  const context = createContext({ registers });
  const executor = new InstructionExecutor();

  executor.execute(
    registerOperation("xor", 0xA, 0xB, 0x8AB3),
    context,
  );

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

  const error = assertThrows(
    () => executor.execute(instruction, context),
    UnsupportedInstructionError,
  );

  assertEquals(error.instruction, instruction);
});
