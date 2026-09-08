# Disassembling CHIP-8 Programs

Chip8NX can inspect encoded CHIP-8 instructions without executing them by combining Core machine semantics with the passive disassembly tools provided by `@chip8nx/inspection`.

This guide covers the practical disassembly API. For design rationale, see [Disassembly architecture](../architecture/disassembly.md).

## Load a ROM into memory

A host obtains ROM bytes, creates a `MemoryImage`, and places it in memory:

```ts
import { CLASSIC_CHIP8_PROFILE, MemoryImage, MemoryImageLoader, Ram } from "@chip8nx/core";

const profile = CLASSIC_CHIP8_PROFILE;
const bytes = await Deno.readFile(path);

const memory = new Ram(profile.memorySize);
const program = new MemoryImage(bytes);

new MemoryImageLoader().load(memory, profile.programStartAddress, program);
```

`MemoryImage` represents the bytes independently of placement. `MemoryImageLoader` performs the copy.

## Create a disassembler

```ts
import { Decoder } from "@chip8nx/core";
import { ClassicInstructionFormatter, Disassembler } from "@chip8nx/inspection";

const disassembler = new Disassembler(new Decoder(), new ClassicInstructionFormatter());
```

The roles are:

```text
Decoder
    → Opcode → typed Instruction

InstructionFormatter
    → typed Instruction → text

Disassembler
    → Memory → coordinate read/decode/format
```

Disassembly does not mutate CPU or machine state.

## Disassemble a known instruction range

Use `disassemble()` when the caller already knows that a byte range contains instructions:

```ts
const instructions = disassembler.disassemble(memory, profile.programStartAddress, 42);
```

Each result contains:

```ts
entry.address;
entry.instruction;
entry.text;
```

For example:

```ts
for (const entry of instructions) {
  console.log(entry.address, entry.instruction.opcode, entry.text);
}
```

A formatted listing may contain:

```text
CLS
LD V0, 0x01
LD V1, 0x02
ADD V0, V1
JP 0x200
```

### Do not assume the entire ROM is code

Real CHIP-8 programs may mix executable instructions with:

```text
sprites
lookup tables
strings
constants
other data
```

Some data words fail decoding; others coincidentally resemble valid opcodes.

> Successful decoding does not prove that a word is executable code.

Use strict range disassembly when the caller has external reason to treat the range as instructions.

## Inspect one instruction

Use `disassembleAt()` for a known address:

```ts
const entry = disassembler.disassembleAt(memory, profile.programStartAddress);

console.log(entry.text);
```

An inspection UI or future debugger can use current CPU state to choose the address:

```ts
const currentInstruction = disassembler.disassembleAt(memory, cpu.snapshot().programCounter);
```

The higher-level consumer owns that relationship. `Disassembler` remains independent of CPU state.

## Use structured instruction data

The formatted text is only one representation.

Because each result retains the typed `Instruction`, higher-level tooling can inspect semantic fields directly:

```ts
console.log(entry.instruction.kind);
console.log(entry.instruction.opcode);
```

Do not parse assembly text to recover semantic instruction data.

## Customize formatting

Implement `InstructionFormatter` when a consumer needs another assembly syntax or text presentation:

```ts
import type { Instruction } from "@chip8nx/core";
import type { InstructionFormatter } from "@chip8nx/inspection";

class MyFormatter implements InstructionFormatter {
  format(instruction: Instruction): string {
    // Format semantic instruction fields.
    return instruction.kind;
  }
}
```

Then inject it:

```ts
const disassembler = new Disassembler(new Decoder(), new MyFormatter());
```

### Format typed instructions, not raw opcode fields

A formatter receives an already-decoded `Instruction`.

Use fields such as:

```ts
instruction.register;
instruction.value;
```

where the narrowed instruction kind provides them, rather than re-extracting fields from `instruction.opcode`.

Opcode interpretation belongs to `Decoder`.

### Keep richer metadata separate

The formatter's current contract is deliberately small:

```ts
format(instruction: Instruction): string;
```

Descriptions, symbols, comments, control-flow information, or other higher-level inspection metadata can be layered around `DisassembledInstruction` without expanding the base text-formatting capability prematurely.

## Whole-ROM exploratory inspection

For unknown ROM structure, an application can build tolerant linear traversal over `disassembleAt()`:

```text
ROM
 ↓
read next two-byte word
 ↓
disassembleAt()
 ├── valid instruction → print it
 └── invalid opcode    → print UNKNOWN
 ↓
continue
```

Example:

```text
0x200  124E  JP 0x24E
0x202  EAAC  UNKNOWN
0x204  AAEA  LD I, 0xAEA
0x206  CEAA  RND VE, 0xAA
```

The successful `AAEA` decode still does not prove that the bytes are code.

The `apps/disassembler` command-line application demonstrates this tolerant policy. It catches `InvalidOpcodeError` per word and continues; strict Inspection range disassembly does not.

## Range behavior

CHIP-8 instructions are two bytes wide. `disassemble()` processes every complete instruction contained in the requested byte length.

### Odd byte lengths

An odd byte length is valid:

```text
[byte byte] [byte byte] [byte]
     1           2        ignored
```

```ts
const instructions = disassembler.disassemble(memory, profile.programStartAddress, 5);

// instructions.length === 2
```

The unmatched trailing byte is ignored.

### Invalid byte lengths

`byteLength` must be a non-negative safe integer.

Invalid examples include:

```ts
-1;
1.5;
Number.NaN;
Number.POSITIVE_INFINITY;
```

They cause `RangeError`.

A zero-length range is valid and reads no memory.

## Error behavior

### Invalid opcodes

Strict range disassembly is fail-fast:

```text
0x200  6001   valid
0x202  8AB8   invalid
0x204  7001   not reached
```

`Decoder` throws `InvalidOpcodeError`, and the range operation does not return a partial listing.

```ts
import { InvalidOpcodeError } from "@chip8nx/core";

try {
  const instructions = disassembler.disassemble(memory, startAddress, byteLength);

  // use instructions
} catch (error) {
  if (error instanceof InvalidOpcodeError) {
    console.error("The range contains an invalid CHIP-8 opcode.");
  } else {
    throw error;
  }
}
```

### Memory boundaries

Both bytes of an instruction must exist.

For 4096-byte memory, `0xFFF` has room for only the first byte of an instruction:

```ts
disassembler.disassembleAt(memory, address(0xfff));
```

therefore fails with `RangeError` from the underlying memory implementation.

## Error summary

```text
invalid byte length
    → RangeError from Disassembler

invalid opcode
    → InvalidOpcodeError from Decoder

out-of-range memory access
    → RangeError from Memory
```

The reusable Core and Inspection APIs preserve these ownership boundaries rather than wrapping collaborator errors in disassembly-specific exceptions.

## Related documentation

- [Disassembly architecture](../architecture/disassembly.md)
- [Instruction execution architecture](../architecture/instruction-execution.md)
- [Classic opcode coverage audit](../reference/classic-opcode-audit.md)
