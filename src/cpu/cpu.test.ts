import { assertEquals } from "@std/assert";

import { address } from "../core/types/address.ts";
import { byte } from "../core/types/byte.ts";
import { key } from "../core/types/key.ts";
import { DisplayBuffer } from "../display/display-buffer.ts";
import { ClassicFont } from "../font/classic-font.ts";
import { Decoder } from "../instruction/decoder.ts";
import { TestKeyboard } from "../keyboard/test-keyboard.ts";
import { Ram } from "../memory/ram.ts";
import { TestRandomNumberGenerator } from "../random/test-random-number-generator.ts";
import { Timer } from "../timer/timer.ts";
import { Cpu } from "./cpu.ts";
import type { ExecutionContext } from "./execution-context.ts";
import { IndexRegister } from "./index-register/index-register.ts";
import { InstructionExecutor } from "./instruction-executor.ts";
import { ProgramCounter } from "./program-counter/program-counter.ts";
import { registerIndex } from "./registers/register-index.ts";
import { Registers } from "./registers/registers.ts";
import { Stack } from "./stack/stack.ts";

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
    randomNumberGenerator: new TestRandomNumberGenerator([byte(0)]),
    ...overrides,
  };
}

function createCpu(context: ExecutionContext): Cpu {
  return new Cpu(context, new Decoder(), new InstructionExecutor());
}

Deno.test("CPU fetches a big-endian opcode, decodes it, and executes it", () => {
  const memory = new Ram(0x1000);
  const registers = new Registers();

  memory.write(address(0x200), byte(0x6a));
  memory.write(address(0x201), byte(0x42));

  const context = createContext({
    memory,
    registers,
  });

  const cpu = createCpu(context);

  cpu.step();

  assertEquals(registers.get(registerIndex(0xa)), byte(0x42));

  assertEquals(context.programCounter.getValue(), address(0x202));
});

Deno.test("CPU advances the program counter before executing CALL", () => {
  const memory = new Ram(0x1000);
  const stack = new Stack();

  memory.write(address(0x200), byte(0x2a));
  memory.write(address(0x201), byte(0xbc));

  const context = createContext({
    memory,
    stack,
  });

  const cpu = createCpu(context);

  cpu.step();

  assertEquals(stack.snapshot(), [address(0x202)]);

  assertEquals(context.programCounter.getValue(), address(0xabc));
});

Deno.test("CPU skip instructions advance past the following instruction", () => {
  const memory = new Ram(0x1000);
  const registers = new Registers();

  registers.set(registerIndex(0xa), byte(0x42));

  memory.write(address(0x200), byte(0x3a));
  memory.write(address(0x201), byte(0x42));

  const context = createContext({
    memory,
    registers,
  });

  const cpu = createCpu(context);

  cpu.step();

  assertEquals(context.programCounter.getValue(), address(0x204));
});

Deno.test("CPU jump instructions replace the normally advanced program counter", () => {
  const memory = new Ram(0x1000);

  memory.write(address(0x200), byte(0x1a));
  memory.write(address(0x201), byte(0xbc));

  const context = createContext({ memory });
  const cpu = createCpu(context);

  cpu.step();

  assertEquals(context.programCounter.getValue(), address(0xabc));
});

Deno.test("CPU repeats LD Vx, K until a key press and release completes", () => {
  const memory = new Ram(0x1000);
  const registers = new Registers();
  const keyboard = new TestKeyboard();

  registers.set(registerIndex(0xa), byte(0x42));

  memory.write(address(0x200), byte(0xfa));
  memory.write(address(0x201), byte(0x0a));

  const context = createContext({
    memory,
    registers,
    keyboard,
  });

  const cpu = createCpu(context);

  cpu.step();

  assertEquals(context.programCounter.getValue(), address(0x200));

  assertEquals(registers.get(registerIndex(0xa)), byte(0x42));

  keyboard.press(key(0xb));
  keyboard.release(key(0xb));

  cpu.step();

  assertEquals(registers.get(registerIndex(0xa)), byte(0x0b));

  assertEquals(context.programCounter.getValue(), address(0x202));
});
