import type { Key } from "@chip8nx/core";

/**
 * Receives CHIP-8 key state transitions from one host input source.
 */
export interface KeyboardInput {
  press(key: Key): void;

  release(key: Key): void;

  releaseAll(): void;
}
