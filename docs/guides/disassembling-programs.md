# Disassembling CHIP-8 Programs

Chip8NX Core can inspect encoded CHIP-8 instructions without executing them.

A disassembler reads instruction bytes from memory, decodes them using the same `Decoder` used by CPU execution, and formats the resulting typed instructions for human-readable presentation.

This guide uses the standard Classic CHIP-8 formatter, but applications can provide their own formatting policy.

## Disassemble a ROM

A host application is responsible for obtaining the ROM bytes. For example, a Deno program can read a file from the filesystem:

```ts
const bytes = await Deno.readFile(path);
```

Create a Classic CHIP-8 memory instance and load the ROM at the profile's program start address:

```ts
import { CLASSIC_CHIP8_PROFILE, MemoryImage, MemoryImageLoader, Ram } from "@chip8nx/core";

const profile = CLASSIC_CHIP8_PROFILE;

const memory = new Ram(profile.memorySize);
const program = new MemoryImage(bytes);

new MemoryImageLoader().load(memory, profile.programStartAddress, program);
```

`MemoryImage` represents the ROM contents independently of where they are placed. `MemoryImageLoader` performs the actual copy into memory.

Next, compose a disassembler:

```ts
import { ClassicInstructionFormatter, Decoder, Disassembler } from "@chip8nx/core";

const disassembler = new Disassembler(new Decoder(), new ClassicInstructionFormatter());
```

The three components have separate responsibilities:

```text
Decoder
    → converts an Opcode into a typed Instruction

ClassicInstructionFormatter
    → converts an Instruction into conventional CHIP-8 assembly text

Disassembler
    → reads memory and coordinates decoding and formatting
```

Disassemble the range occupied by the ROM:

```ts
const instructions = disassembler.disassemble(
  memory,
  profile.programStartAddress,
  program.bytes.length,
);
```

Each result contains the instruction's source address, its typed semantic representation, and its formatted text:

```ts
for (const entry of instructions) {
  console.log(entry.address, entry.instruction.opcode, entry.text);
}
```

For a small program, the formatted instructions might represent code such as:

```text
CLS
LD V0, 0x01
LD V1, 0x02
ADD V0, V1
JP 0x200
```

The disassembler only inspects memory. It does not execute these instructions or modify CPU or machine state.

## Inspect a Single Instruction

Use `disassembleAt()` when only one instruction at a known address needs to be inspected:

```ts
const entry = disassembler.disassembleAt(memory, profile.programStartAddress);

console.log(entry.text);
```

For a ROM beginning with opcode `00E0`, the result contains:

```ts
entry.address;
entry.instruction;
entry.text; // "CLS"
```

`disassembleAt()` reads exactly one two-byte CHIP-8 instruction beginning at the supplied address.

This is useful when a tool already knows which location it wants to inspect. For example, a debugger can later use the CPU's current program counter as the source address:

```ts
const currentInstruction = disassembler.disassembleAt(memory, cpu.snapshot().programCounter);
```

The debugger owns the relationship between CPU state and memory inspection. The `Disassembler` itself remains independent of the CPU and simply inspects the address supplied by its caller.

### Structured results

The formatted string is only one part of the result.

Because the decoded `Instruction` is retained, higher-level code can inspect semantic instruction data directly instead of parsing assembly text:

```ts
const entry = disassembler.disassembleAt(memory, profile.programStartAddress);

console.log(entry.text);
console.log(entry.instruction.kind);
console.log(entry.instruction.opcode);
```

This is especially useful for inspection tools that need both a human-readable listing and machine-readable instruction information.

## Use a Custom Formatter

`ClassicInstructionFormatter` is the standard formatting policy supplied by Core, but it is not required by `Disassembler`.

Applications can implement the `InstructionFormatter` interface:

```ts
import type { Instruction, InstructionFormatter } from "@chip8nx/core";

class InstructionKindFormatter implements InstructionFormatter {
  public format(instruction: Instruction): string {
    return instruction.kind;
  }
}
```

The custom formatter can then be supplied during composition:

```ts
const disassembler = new Disassembler(new Decoder(), new InstructionKindFormatter());
```

Disassembling opcode `00E0` with this formatter would produce:

```text
clear-screen
```

instead of:

```text
CLS
```

The disassembler itself does not change.

```text
                     InstructionFormatter
                          ▲          ▲
                          │          │
ClassicInstructionFormatter    InstructionKindFormatter
                          \          /
                           \        /
                           Disassembler
```

This separation allows formatting policy to evolve independently from instruction decoding and memory traversal.

### Format typed instructions, not raw opcodes

A formatter receives an already decoded `Instruction`:

```ts
interface InstructionFormatter {
  format(instruction: Instruction): string;
}
```

It should use the typed instruction's semantic fields rather than decoding opcode bit patterns again.

For example, a formatter handling a load-immediate instruction can use:

```ts
instruction.register;
instruction.value;
```

instead of extracting register and byte fields from:

```ts
instruction.opcode;
```

Opcode interpretation belongs to `Decoder`.

Keeping that responsibility centralized ensures that execution, disassembly, and custom presentation all share the same interpretation of the instruction set.

### Keep richer metadata separate when appropriate

A formatter's current responsibility is to produce text:

```ts
format(instruction: Instruction): string;
```

Higher-level tools may eventually want additional information such as descriptions, comments, symbols, or debugger metadata.

Those concerns do not need to be forced into the formatter contract. Because `DisassembledInstruction` retains the typed `Instruction`, applications can build richer representations around the base result without parsing the formatted text.

This keeps the formatting seam small while leaving higher-level inspection tools room to grow.

## Range and Error Behavior

CHIP-8 instructions are two bytes wide.

When `disassemble()` receives a byte range, it processes every complete instruction contained in that range.

### Odd byte lengths

An odd byte length is valid.

For example, a five-byte range contains two complete instructions and one unmatched trailing byte:

```text
[byte byte] [byte byte] [byte]
     1           2        ignored
```

The final byte is ignored because it cannot form a complete CHIP-8 instruction.

```ts
const instructions = disassembler.disassemble(memory, profile.programStartAddress, 5);

// instructions.length === 2
```

This is useful when the inspected data contains a trailing byte that does not belong to a complete instruction.

### Invalid byte lengths

`byteLength` must be a non-negative safe integer.

Values such as these are invalid:

```ts
-1;
1.5;
Number.NaN;
Number.POSITIVE_INFINITY;
```

They cause `disassemble()` to throw `RangeError`.

A zero-length range is valid:

```ts
const instructions = disassembler.disassemble(memory, profile.programStartAddress, 0);

// []
```

No memory is read in that case.

### Invalid opcodes

The disassembler uses `Decoder` to interpret each complete two-byte word.

If the decoder encounters an invalid opcode, it throws `InvalidOpcodeError`.

Range disassembly is currently fail-fast:

```text
0x200  6001   valid
0x202  8AB8   invalid
0x204  7001   not reached
```

The operation stops at the invalid instruction and does not return a partial listing.

Applications that use the disassembler should therefore handle `InvalidOpcodeError` when processing untrusted or potentially malformed data:

```ts
import { InvalidOpcodeError } from "@chip8nx/core";

try {
  const instructions = disassembler.disassemble(
    memory,
    profile.programStartAddress,
    program.bytes.length,
  );

  // use instructions
} catch (error) {
  if (error instanceof InvalidOpcodeError) {
    console.error("The ROM contains an invalid CHIP-8 opcode.");
  } else {
    throw error;
  }
}
```

The base disassembler does not replace invalid words with placeholder entries or silently skip them.

### Memory boundaries

Reading an instruction requires both of its bytes to exist in memory.

If either byte lies outside the available address space, the underlying memory implementation throws `RangeError`.

For example, in a 4096-byte memory, address `0xFFF` contains only enough space for one byte:

```text
0xFFF   first byte
0x1000  outside memory
```

Therefore:

```ts
disassembler.disassembleAt(memory, address(0xfff));
```

throws `RangeError`.

The same rule applies during range traversal if a requested complete instruction extends beyond memory.

### Error summary

The errors exposed by the disassembly API follow the component that owns the violated contract:

```text
invalid byte length
    → RangeError from Disassembler

invalid opcode
    → InvalidOpcodeError from Decoder

out-of-range memory access
    → RangeError from Memory
```

The disassembler does not currently translate these into additional wrapper exceptions.

## Where to Go Next

For the design rationale behind the subsystem, see the disassembly architecture documentation.

That document explains:

- why disassembly reuses the existing `Decoder`;
- how inspection differs from execution;
- why formatting is a replacement point;
- how dependency injection and dependency inversion are applied;
- why the subsystem remains stateless;
- which future extension points are intentionally deferred.

A small command-line disassembler is a natural example consumer of this API:

```text
ROM file
   ↓
host file I/O
   ↓
MemoryImage
   ↓
Memory
   ↓
Disassembler
   ↓
formatted listing
   ↓
stdout
```

Such a tool belongs outside Core. Core provides the reusable inspection components, while the application owns argument parsing, filesystem access, output formatting, and process exit behavior.

The same Core API can later support debugger, tracer, and graphical inspection features without coupling the disassembly subsystem to any one host.
