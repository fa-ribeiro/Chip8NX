/**
 * Represents an elapsed amount of time in nanoseconds.
 *
 * A Duration represents a difference between two points in time rather than
 * an absolute point in time.
 *
 * @remarks
 * The underlying representation is `bigint` so duration arithmetic remains
 * exact. Using an explicit domain type also prevents accidentally confusing
 * durations with timestamps or unrelated numeric values.
 */
export type Duration = bigint & { readonly __brand: "Duration" };

/**
 * Creates a Duration from a number of nanoseconds.
 *
 * @param nanoseconds - Number of nanoseconds.
 * @returns The corresponding Duration.
 */
export function duration(nanoseconds: Duration): Duration {
  return nanoseconds;
}
