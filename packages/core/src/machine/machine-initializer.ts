import { type Address, address } from "../core/types/address.ts";
import { byte } from "../core/types/byte.ts";
import type { ExecutionContext } from "../cpu/execution-context.ts";
import type { MemoryImageLoader } from "../memory/memory-image-loader.ts";
import type { MemoryImage } from "../memory/memory-image.ts";
import type { Chip8Profile } from "./chip8-profile.ts";

/**
 * Establishes the initial state of an already-constructed CHIP-8 machine.
 *
 * @remarks
 * The initializer coordinates mutable machine state and memory layout. It does
 * not construct components, perform external I/O, choose host implementations,
 * or control runtime scheduling.
 *
 * Memory-layout validation is completed before any machine state is mutated so
 * invalid profile/program combinations do not leave the machine partially
 * reset.
 */
export class MachineInitializer {
  /**
   * Creates a machine initializer.
   *
   * @param memoryImageLoader - Loader used to install system and program images.
   */
  public constructor(private readonly memoryImageLoader: MemoryImageLoader) {}

  /**
   * Resets a machine and installs the profile's system data and program image.
   *
   * @param context - Mutable components belonging to the machine.
   * @param profile - Profile describing the machine being initialized.
   * @param program - Program image to load at the profile's program start address.
   *
   * @throws {RangeError}
   * If the supplied memory does not match the profile, an image does not fit in
   * memory, or the profile font overlaps the program image.
   */
  public initialize(
    context: ExecutionContext,
    profile: Chip8Profile,
    program: MemoryImage,
  ): void {
    this.validateMemoryLayout(context, profile, program);

    context.memory.clear();
    context.registers.clear();
    context.stack.clear();

    context.indexRegister.setValue(address(0));
    context.programCounter.setValue(profile.programStartAddress);

    context.delayTimer.setValue(byte(0));
    context.soundTimer.setValue(byte(0));

    context.displayBuffer.reset();
    context.verticalBlank.reset();
    context.keyboard.reset();

    context.exitState.reset();

    const smallFont = profile.fonts.small;
    const largeFont = profile.fonts.large;

    this.memoryImageLoader.load(context.memory, smallFont.baseAddress, smallFont.image);

    if (largeFont !== null) {
      this.memoryImageLoader.load(context.memory, largeFont.baseAddress, largeFont.image);
    }

    this.memoryImageLoader.load(context.memory, profile.programStartAddress, program);
  }

  /**
   * Validates all memory relationships needed by initialization before the
   * machine is mutated.
   */
  private validateMemoryLayout(
    context: ExecutionContext,
    profile: Chip8Profile,
    program: MemoryImage,
  ): void {
    const smallFont = profile.fonts.small;
    const largeFont = profile.fonts.large;

    if (smallFont.image.bytes.length === 0) {
      throw new RangeError("Font image must not be empty.");
    }

    if (program.bytes.length === 0) {
      throw new RangeError("Program image must not be empty.");
    }

    if (context.memory.size !== profile.memorySize) {
      throw new RangeError(
        `Machine memory size ${context.memory.size} does not match ` +
          `profile memory size ${profile.memorySize}.`,
      );
    }

    if (largeFont !== null) {
      if (largeFont.image.bytes.length === 0) {
        throw new RangeError("Large font image must not be empty.");
      }

      this.validateImageFitsMemory(
        "Large font",
        largeFont.baseAddress,
        largeFont.image,
        profile.memorySize,
      );

      if (
        this.rangesOverlap(
          smallFont.baseAddress,
          smallFont.image.bytes.length,
          largeFont.baseAddress,
          largeFont.image.bytes.length,
        )
      ) {
        throw new RangeError("Large font image overlaps the font image.");
      }

      if (
        this.rangesOverlap(
          largeFont.baseAddress,
          largeFont.image.bytes.length,
          profile.programStartAddress,
          program.bytes.length,
        )
      ) {
        throw new RangeError("Large font image overlaps the program image.");
      }
    }

    this.validateImageFitsMemory(
      "Font",
      smallFont.baseAddress,
      smallFont.image,
      profile.memorySize,
    );

    this.validateImageFitsMemory(
      "Program",
      profile.programStartAddress,
      program,
      profile.memorySize,
    );

    if (
      this.rangesOverlap(
        smallFont.baseAddress,
        smallFont.image.bytes.length,
        profile.programStartAddress,
        program.bytes.length,
      )
    ) {
      throw new RangeError("Font image overlaps the program image.");
    }
  }

  /**
   * Validates that an image's complete half-open address range belongs to the
   * configured memory address space.
   */
  private validateImageFitsMemory(
    imageName: string,
    startAddress: Address,
    image: MemoryImage,
    memorySize: number,
  ): void {
    const endAddressExclusive = startAddress + image.bytes.length;

    if (endAddressExclusive > memorySize) {
      throw new RangeError(
        `${imageName} image starting at 0x${startAddress.toString(16)} ` +
          `with ${image.bytes.length} bytes exceeds memory size ${memorySize}.`,
      );
    }
  }

  /**
   * Determines whether two half-open memory ranges overlap.
   */
  private rangesOverlap(
    firstStart: Address,
    firstLength: number,
    secondStart: Address,
    secondLength: number,
  ): boolean {
    const firstEndExclusive = firstStart + firstLength;
    const secondEndExclusive = secondStart + secondLength;

    return firstStart < secondEndExclusive && secondStart < firstEndExclusive;
  }
}
