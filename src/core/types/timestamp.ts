/**
 * Represents a point on a monotonic time scale, in nanoseconds.
 *
 * A Timestamp is suitable for measuring elapsed time. It must not be
 * interpreted as calendar or wall-clock time.
 *
 * @remarks
 * Timestamp and Duration deliberately use different types even though both
 * are represented by `bigint`. This makes their different semantics explicit
 * at the API boundary.
 */
export type Timestamp = bigint & {
  readonly __brand: "Timestamp";
};

/**
 * Creates a Timestamp from a number of nanoseconds.
 *
 * @param nanoseconds - Number of nanoseconds since the clock's origin.
 * @returns The corresponding Timestamp.
 */
export function timestamp(nanoseconds: Timestamp): Timestamp {
  return nanoseconds;
}
