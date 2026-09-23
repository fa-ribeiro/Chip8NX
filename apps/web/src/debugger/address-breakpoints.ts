import type { Address } from "@chip8nx/core";

/**
 * One configured address breakpoint in the Web debugger.
 */
export interface AddressBreakpoint {
  readonly address: Address;
  readonly enabled: boolean;
}

/**
 * Owns configured Web address breakpoints and their transient execution state.
 *
 * @remarks
 * Breakpoint configuration can outlive an individual Web machine composition,
 * while pending hits and resume suppression belong only to the current execution
 * flow. The host can therefore preserve breakpoints across a profile
 * recomposition without leaking transient execution state into the replacement
 * machine.
 */
export class AddressBreakpoints {
  private readonly breakpoints = new Map<Address, boolean>();

  private pendingHit: Address | undefined;
  private suppressedAddress: Address | undefined;

  /**
   * Adds an enabled breakpoint at the supplied address.
   *
   * @returns `true` when a breakpoint was added, or `false` when one already
   * existed at that address.
   */
  public add(address: Address): boolean {
    if (this.breakpoints.has(address)) {
      return false;
    }

    this.breakpoints.set(address, true);

    return true;
  }

  /**
   * Removes the breakpoint at the supplied address.
   *
   * @returns Whether a breakpoint existed and was removed.
   */
  public remove(address: Address): boolean {
    return this.breakpoints.delete(address);
  }

  /**
   * Enables or disables an existing breakpoint.
   *
   * @returns `true` when the configured state changed, otherwise `false`.
   */
  public setEnabled(address: Address, enabled: boolean): boolean {
    const current = this.breakpoints.get(address);

    if (current === undefined || current === enabled) {
      return false;
    }

    this.breakpoints.set(address, enabled);

    return true;
  }

  /**
   * Returns the configured breakpoint at the supplied address.
   */
  public get(address: Address): AddressBreakpoint | undefined {
    const enabled = this.breakpoints.get(address);

    if (enabled === undefined) {
      return undefined;
    }

    return { address, enabled };
  }

  /**
   * Returns configured breakpoints ordered by ascending address.
   */
  public snapshot(): readonly AddressBreakpoint[] {
    return [...this.breakpoints.entries()]
      .map(([address, enabled]) => ({ address, enabled }))
      .sort((left, right) => left.address - right.address);
  }

  /**
   * Decides whether scheduled execution may proceed at the supplied address.
   *
   * @remarks
   * An enabled breakpoint denies execution and records a pending hit for the
   * Web lifecycle to consume after the runtime tick returns. Resume suppression
   * permits repeated scheduled attempts at the stopped address and expires only
   * after execution reaches a different address. This allows retryable
   * instructions to complete without immediately re-hitting the same breakpoint.
   */
  public shouldExecute(address: Address): boolean {
    if (this.suppressedAddress !== undefined) {
      if (this.suppressedAddress === address) {
        return true;
      }

      this.suppressedAddress = undefined;
    }

    if (this.breakpoints.get(address) !== true) {
      return true;
    }

    this.pendingHit = address;

    return false;
  }

  /**
   * Suppresses the breakpoint while scheduled execution remains at this address.
   */
  public suppressWhileAt(address: Address): void {
    this.suppressedAddress = address;
  }

  /**
   * Returns and clears the most recently recorded breakpoint hit.
   */
  public takeHit(): Address | undefined {
    const hit = this.pendingHit;

    this.pendingHit = undefined;

    return hit;
  }

  /**
   * Clears transient hit/suppression state without changing configured
   * breakpoints.
   */
  public resetExecutionState(): void {
    this.pendingHit = undefined;
    this.suppressedAddress = undefined;
  }

  /**
   * Removes all configured breakpoints and transient execution state.
   */
  public clear(): void {
    this.breakpoints.clear();
    this.resetExecutionState();
  }
}
