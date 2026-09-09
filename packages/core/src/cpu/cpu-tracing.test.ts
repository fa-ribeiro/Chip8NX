import { assert, assertEquals, assertStrictEquals, assertThrows } from "@std/assert";
import { address } from "../core/types/address.ts";
import { byte } from "../core/types/byte.ts";
import { key } from "../core/types/key.ts";
import { opcode } from "../core/types/opcode.ts";
import { DisplayBuffer } from "../display/display-buffer.ts";
import { VerticalBlank } from "../display/vertical-blank.ts";
import { ClassicFont } from "../font/classic-font.ts";
import { Decoder, InvalidOpcodeError } from "../instruction/decoder.ts";
import { KeyboardState } from "../keyboard/keyboard-state.ts";
import { CLASSIC_CHIP8_PROFILE } from "../machine/classic/classic-chip8-profile.ts";
import { Ram } from "../memory/ram.ts";
import { TestRandomNumberGenerator } from "../random/test-random-number-generator.ts";
import { Timer } from "../timer/timer.ts";
import type { InstructionTrace } from "../cpu/observation/instruction-trace.ts";
import type { InstructionTraceObserver } from "../cpu/observation/instruction-trace-observer.ts";
import { Cpu } from "./cpu.ts";
import type { ExecutionContext } from "./execution-context.ts";
import { IndexRegister } from "./index-register/index-register.ts";
import { InstructionExecutor } from "./instruction-executor.ts";
import { ProgramCounter } from "./program-counter/program-counter.ts";
import { registerIndex } from "./registers/register-index.ts";
import { Registers } from "./registers/registers.ts";
import { Stack } from "./stack/stack.ts";

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

function createCpu(context: ExecutionContext, observer?: InstructionTraceObserver): Cpu {
  return new Cpu(context, new Decoder(), new InstructionExecutor(), observer);
}

Deno.test("CPU emits a successful instruction trace", () => {
  const memory = new Ram(0x1000);
  const registers = new Registers();
  const traces: InstructionTrace[] = [];
  memory.write(address(0x200), byte(0x6a));
  memory.write(address(0x201), byte(0x42));

  const context = createContext({ memory, registers });
  createCpu(context, { observe: (trace) => traces.push(trace) }).step();

  const trace = traces[0];
  assert(trace !== undefined);
  assertEquals(trace.outcome, "success");
  if (trace.outcome !== "success") {
    throw new Error("Expected success trace");
  }
  assertEquals(trace.instruction.opcode, opcode(0x6a42));
  assertEquals(trace.before.programCounter, address(0x200));
  assertEquals(trace.after.programCounter, address(0x202));
  assertEquals(trace.after.registers[0xa], byte(0x42));
});

Deno.test("CPU traces a normally returned instruction attempt that retries", () => {
  const memory = new Ram(0x1000);
  const keyboard = new KeyboardState();
  const traces: InstructionTrace[] = [];
  memory.write(address(0x200), byte(0xfa));
  memory.write(address(0x201), byte(0x0a));

  const context = createContext({ memory, keyboard });
  const cpu = createCpu(context, { observe: (trace) => traces.push(trace) });
  cpu.step();

  const first = traces[0];
  assert(first !== undefined && first.outcome === "success");
  assertEquals(first.before.programCounter, address(0x200));
  assertEquals(first.after.programCounter, address(0x200));

  keyboard.press(key(0xb));
  keyboard.release(key(0xb));
  cpu.step();

  const second = traces[1];
  assert(second !== undefined && second.outcome === "success");
  assertEquals(second.after.programCounter, address(0x202));
});

Deno.test("CPU isolates successful trace observer failures", () => {
  const memory = new Ram(0x1000);
  const registers = new Registers();
  memory.write(address(0x200), byte(0x6a));
  memory.write(address(0x201), byte(0x42));

  const context = createContext({ memory, registers });
  createCpu(context, {
    observe: () => {
      throw new Error("observer failed");
    },
  }).step();
  assertEquals(registers.get(registerIndex(0xa)), byte(0x42));
  assertEquals(context.programCounter.getValue(), address(0x202));
});

Deno.test("CPU traces a fetch failure before a complete opcode exists", () => {
  const memory = new Ram(0x201);
  memory.write(address(0x200), byte(0x61));
  const traces: InstructionTrace[] = [];
  const cpu = createCpu(createContext({ memory }), {
    observe: (trace) => traces.push(trace),
  });

  const thrown = assertThrows(() => cpu.step(), RangeError);
  const trace = traces[0];
  assert(trace !== undefined && trace.outcome === "failure");
  assertEquals(trace.opcode, undefined);
  assertEquals(trace.instruction, undefined);
  assertEquals(trace.before.programCounter, address(0x200));
  assertEquals(trace.after.programCounter, address(0x200));
  assertStrictEquals(trace.error, thrown);
});

Deno.test("CPU traces a decode failure after advancing the program counter", () => {
  const memory = new Ram(0x1000);
  memory.write(address(0x200), byte(0xff));
  memory.write(address(0x201), byte(0xff));
  const traces: InstructionTrace[] = [];
  const cpu = createCpu(createContext({ memory }), {
    observe: (trace) => traces.push(trace),
  });

  const thrown = assertThrows(() => cpu.step(), InvalidOpcodeError);
  const trace = traces[0];
  assert(trace !== undefined && trace.outcome === "failure");
  assertEquals(trace.opcode, opcode(0xffff));
  assertEquals(trace.instruction, undefined);
  assertEquals(trace.before.programCounter, address(0x200));
  assertEquals(trace.after.programCounter, address(0x202));
  assertStrictEquals(trace.error, thrown);
});

Deno.test("CPU traces an execution failure with the decoded instruction", () => {
  const memory = new Ram(0x1000);
  memory.write(address(0x200), byte(0x00));
  memory.write(address(0x201), byte(0xee));
  const traces: InstructionTrace[] = [];
  const cpu = createCpu(createContext({ memory }), {
    observe: (trace) => traces.push(trace),
  });

  const thrown = assertThrows(() => cpu.step(), RangeError);
  const trace = traces[0];
  assert(trace !== undefined && trace.outcome === "failure");
  assertEquals(trace.opcode, opcode(0x00ee));
  assertEquals(trace.instruction?.kind, "return");
  assertEquals(trace.after.programCounter, address(0x202));
  assertStrictEquals(trace.error, thrown);
});

Deno.test("CPU preserves the original failure when the trace observer throws", () => {
  const memory = new Ram(0x1000);
  memory.write(address(0x200), byte(0xff));
  memory.write(address(0x201), byte(0xff));
  let observed: InstructionTrace | undefined;

  const cpu = createCpu(createContext({ memory }), {
    observe(trace): void {
      observed = trace;
      throw new Error("trace observer failed");
    },
  });

  const thrown = assertThrows(() => cpu.step(), InvalidOpcodeError);
  assert(observed !== undefined && observed.outcome === "failure");
  assertStrictEquals(thrown, observed.error);
});
