import type { Frequency } from "../core/types/frequency.ts";

/**
 * Configures how a CHIP-8 machine is driven at runtime.
 *
 * @remarks
 * Runtime configuration contains execution-policy choices rather than
 * machine-profile characteristics.
 */
export interface Chip8RuntimeConfiguration {
  /**
   * Frequency at which CHIP-8 instructions are executed.
   */
  readonly cpuFrequency: Frequency;
}
