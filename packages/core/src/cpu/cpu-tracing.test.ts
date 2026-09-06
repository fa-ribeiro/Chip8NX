import { assertEquals } from "@std/assert";
import { address } from "../core/types/address.ts";
import { byte } from "../core/types/byte.ts";
import { key } from "../core/types/key.ts";
import { opcode } from "../core/types/opcode.ts";
import { DisplayBuffer } from "../display/display-buffer.ts";
import { VerticalBlank } from "../display/vertical-blank.ts";
import { ClassicFont } from "../font/classic-font.ts";
import { Decoder } from "../instruction/decoder.ts";
import { KeyboardState } from "../keyboard/keyboard-state.ts";
import { CLASSIC_CHIP8_PROFILE } from "../machine/classic/classic-chip8-profile.ts";
import { Ram } from "../memory/ram.ts";
import { TestRandomNumberGenerator } from "../random/test-random-number-generator.ts";
import { Timer } from "../timer/timer.ts";
import type { InstructionTrace } from "../tracing/instruction-trace.ts";
import type { InstructionTraceObserver } from "../tracing/instruction-trace-observer.ts";
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

function createCpu(
  context: ExecutionContext,
  traceObserver?: InstructionTraceObserver,
): Cpu {
  return new Cpu(context, new Decoder(), new InstructionExecutor(), traceObserver);
}

Deno.test("CPU emits an instruction trace after a normally returned attempt", () => {
  const memory = new Ram(0x1000);
  const registers = new Registers();
  const traces: InstructionTrace[] = [];

  memory.write(address(0x200), byte(0x6a));
  memory.write(address(0x201), byte(0x42));

  const context = createContext({ memory, registers });
  const cpu = createCpu(context, { observe: (trace) => traces.push(trace) });

  cpu.step();

  assertEquals(traces.length, 1);

  const trace = traces[0] as InstructionTrace;
  assertEquals(trace.instruction.opcode, opcode(0x6a42));
  assertEquals(trace.before.programCounter, address(0x200));
  assertEquals(trace.before.registers[0xa], byte(0));
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

  assertEquals(traces.length, 1);
  assertEquals(traces[0]?.instruction.opcode, opcode(0xfa0a));
  assertEquals(traces[0]?.before.programCounter, address(0x200));
  assertEquals(traces[0]?.after.programCounter, address(0x200));

  keyboard.press(key(0xb));
  keyboard.release(key(0xb));
  cpu.step();

  assertEquals(traces.length, 2);
  assertEquals(traces[1]?.before.programCounter, address(0x200));
  assertEquals(traces[1]?.after.programCounter, address(0x202));
});

Deno.test("CPU isolates instruction trace observer failures from execution", () => {
  const memory = new Ram(0x1000);
  const registers = new Registers();

  memory.write(address(0x200), byte(0x6a));
  memory.write(address(0x201), byte(0x42));

  const context = createContext({ memory, registers });
  const cpu = createCpu(context, {
    observe(): void {
      throw new Error("trace observer failure");
    },
  });

  cpu.step();

  assertEquals(registers.get(registerIndex(0xa)), byte(0x42));
  assertEquals(context.programCounter.getValue(), address(0x202));
});
