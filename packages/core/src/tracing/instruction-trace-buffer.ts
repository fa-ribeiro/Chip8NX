import type { InstructionTrace } from "./instruction-trace.ts";
import type { InstructionTraceObserver } from "./instruction-trace-observer.ts";

/**
 * Retains a bounded history of CPU instruction traces.
 *
 * @remarks
 * Traces are retained in observation order. Once the configured capacity is
 * reached, observing a new trace discards the oldest retained trace.
 *
 * The buffer stores the immutable trace objects it receives rather than
 * copying them again.
 */
export class InstructionTraceBuffer implements InstructionTraceObserver {
  private readonly storage: InstructionTrace[] = [];

  private readonly maximumCapacity: number;

  private nextWriteIndex = 0;

  private retainedSize = 0;

  /**
   * Creates a bounded instruction-trace history.
   *
   * @param capacity - Maximum number of traces to retain.
   * @throws {RangeError} If capacity is not a positive safe integer.
   */
  public constructor(capacity: number) {
    if (!Number.isSafeInteger(capacity) || capacity <= 0) {
      throw new RangeError("Instruction trace buffer capacity must be a positive integer.");
    }

    this.maximumCapacity = capacity;
  }

  /**
   * Number of traces currently retained.
   */
  public get size(): number {
    return this.retainedSize;
  }

  /**
   * Maximum number of traces that may be retained.
   */
  public get capacity(): number {
    return this.maximumCapacity;
  }

  /**
   * Retains one instruction trace.
   *
   * When the buffer is full, the oldest retained trace is replaced.
   *
   * @param trace - Instruction trace to retain.
   */
  public observe(trace: InstructionTrace): void {
    this.storage[this.nextWriteIndex] = trace;

    this.nextWriteIndex = (this.nextWriteIndex + 1) % this.maximumCapacity;

    if (this.retainedSize < this.maximumCapacity) {
      this.retainedSize++;
    }
  }

  /**
   * Returns the currently retained traces from oldest to newest.
   *
   * The returned array is independent from the buffer's mutable storage.
   */
  public snapshot(): readonly InstructionTrace[] {
    const result: InstructionTrace[] = [];

    const oldestIndex = this.retainedSize === this.maximumCapacity ? this.nextWriteIndex : 0;

    for (let offset = 0; offset < this.retainedSize; offset++) {
      const index = (oldestIndex + offset) % this.maximumCapacity;
      const trace = this.storage[index];

      if (trace === undefined) {
        throw new Error("Instruction trace buffer internal invariant violated.");
      }

      result.push(trace);
    }

    return result;
  }

  /**
   * Discards all retained traces without changing the configured capacity.
   */
  public clear(): void {
    this.storage.length = 0;
    this.nextWriteIndex = 0;
    this.retainedSize = 0;
  }
}
