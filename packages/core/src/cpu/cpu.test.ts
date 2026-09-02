import { assertEquals } from "@std/assert";

import { address } from "../core/types/address.ts";
import { byte } from "../core/types/byte.ts";
import { key } from "../core/types/key.ts";
import { DisplayBuffer } from "../display/display-buffer.ts";
import { VerticalBlank } from "../display/vertical-blank.ts";
import { ClassicFont } from "../font/classic-font.ts";
import { Decoder } from "../instruction/decoder.ts";
import { KeyboardState } from "../keyboard/keyboard-state.ts";
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

import { CLASSIC_CHIP8_PROFILE } from "../machine/classic/classic-chip8-profile.ts";

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
    displayBuffer: new DisplayBuffer(profile.display.width, profile.display.height),
    verticalBlank: new VerticalBlank(),
    keyboard: new KeyboardState(),
    font: new ClassicFont(profile.fontBaseAddress),
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
  const stack = new Stack(CLASSIC_CHIP8_PROFILE.stackCapacity);

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
  const keyboard = new KeyboardState();

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

Deno.test("CPU snapshot captures the current CPU state", () => {
  const registers = new Registers();
  const stack = new Stack(CLASSIC_CHIP8_PROFILE.stackCapacity);
  const indexRegister = new IndexRegister(address(0x345));
  const programCounter = new ProgramCounter(address(0x678));
  const delayTimer = new Timer(byte(0x12));
  const soundTimer = new Timer(byte(0x34));

  registers.set(registerIndex(0x0), byte(0x10));
  registers.set(registerIndex(0xa), byte(0xaa));
  registers.set(registerIndex(0xf), byte(0xff));

  stack.push(address(0x220));
  stack.push(address(0x240));

  const context = createContext({
    registers,
    stack,
    indexRegister,
    programCounter,
    delayTimer,
    soundTimer,
  });

  const cpu = createCpu(context);

  const state = cpu.snapshot();

  assertEquals(state.registers, registers.snapshot());

  assertEquals(state.index, address(0x345));

  assertEquals(state.programCounter, address(0x678));

  assertEquals(state.stack, [address(0x220), address(0x240)]);

  assertEquals(state.delayTimer, byte(0x12));

  assertEquals(state.soundTimer, byte(0x34));
});

Deno.test("CPU snapshot is unaffected by subsequent CPU state changes", () => {
  const registers = new Registers();
  const stack = new Stack(CLASSIC_CHIP8_PROFILE.stackCapacity);
  const indexRegister = new IndexRegister(address(0x300));
  const programCounter = new ProgramCounter(address(0x200));
  const delayTimer = new Timer(byte(10));
  const soundTimer = new Timer(byte(20));

  registers.set(registerIndex(0xa), byte(0x42));
  stack.push(address(0x220));

  const context = createContext({
    registers,
    stack,
    indexRegister,
    programCounter,
    delayTimer,
    soundTimer,
  });

  const cpu = createCpu(context);

  const state = cpu.snapshot();

  registers.set(registerIndex(0xa), byte(0xff));
  stack.push(address(0x240));
  indexRegister.setValue(address(0x400));
  programCounter.setValue(address(0x500));
  delayTimer.setValue(byte(30));
  soundTimer.setValue(byte(40));

  assertEquals(state.registers[0xa], byte(0x42));

  assertEquals(state.stack, [address(0x220)]);

  assertEquals(state.index, address(0x300));

  assertEquals(state.programCounter, address(0x200));

  assertEquals(state.delayTimer, byte(10));

  assertEquals(state.soundTimer, byte(20));
});
