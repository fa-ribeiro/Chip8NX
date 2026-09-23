import { type Address, address, type Byte, type Memory } from "@chip8nx/core";

export const MEMORY_PAGE_SIZE = 0x40;
export const MEMORY_ROW_SIZE = 0x08;

export type MemoryAddressParseResult =
  | {
    readonly outcome: "success";
    readonly address: Address;
  }
  | {
    readonly outcome: "failure";
    readonly message: string;
  };

export interface MemoryInspectionRow {
  readonly address: Address;
  readonly bytes: readonly Byte[];
}

export interface MemoryInspectionPage {
  readonly startAddress: Address;
  readonly endAddress: Address;
  readonly rows: readonly MemoryInspectionRow[];
}

export interface MemoryReferenceAddresses {
  readonly programCounter: Address;
  readonly indexRegister: Address;
}

/**
 * Formats one memory row as printable ASCII, replacing non-printable bytes
 * with a dot and padding partial rows to the normal eight-byte width.
 */
export function formatMemoryCharacters(bytes: readonly Byte[]): string {
  let result = "";

  for (let column = 0; column < MEMORY_ROW_SIZE; column++) {
    const value = bytes[column];

    if (value === undefined) {
      result += " ";

      continue;
    }

    result += value >= 0x20 && value <= 0x7e ? String.fromCharCode(value) : ".";
  }

  return result;
}

/**
 * Parses one hexadecimal address for the Web memory inspector.
 *
 * @remarks
 * Bare values are interpreted as hexadecimal so memory input matches the
 * address notation used throughout the Web inspection UI.
 */
export function parseMemoryAddress(text: string, memorySize: number): MemoryAddressParseResult {
  const normalized = text.trim();

  if (normalized.length === 0) {
    return {
      outcome: "failure",
      message: "Enter a hexadecimal address such as 0x200.",
    };
  }

  const hexadecimal = normalized.toLowerCase().startsWith("0x")
    ? normalized.slice(2)
    : normalized;

  if (!/^[0-9a-f]+$/i.test(hexadecimal)) {
    return {
      outcome: "failure",
      message: "Enter a hexadecimal address such as 0x200.",
    };
  }

  const value = Number.parseInt(hexadecimal, 16);

  if (!Number.isSafeInteger(value) || value >= memorySize) {
    return {
      outcome: "failure",
      message: `Address must be between 0x000 and ${formatAddress(address(memorySize - 1))}.`,
    };
  }

  return {
    outcome: "success",
    address: address(value),
  };
}

/**
 * Reads at most one 64-byte memory page beginning exactly at `startAddress`.
 *
 * @remarks
 * The start address is deliberately not aligned. If a user asks to inspect
 * `0x203`, the first row begins at `0x203` rather than silently moving the
 * view to another address.
 */
export function inspectMemoryPage(memory: Memory, startAddress: Address): MemoryInspectionPage {
  if (startAddress >= memory.size) {
    throw new RangeError(
      `Memory inspection start ${formatAddress(startAddress)} is outside the address space.`,
    );
  }

  const endExclusive = Math.min(startAddress + MEMORY_PAGE_SIZE, memory.size);
  const rows: MemoryInspectionRow[] = [];

  for (
    let rowStart: number = startAddress;
    rowStart < endExclusive;
    rowStart += MEMORY_ROW_SIZE
  ) {
    const rowEnd = Math.min(rowStart + MEMORY_ROW_SIZE, endExclusive);
    const bytes: Byte[] = [];

    for (let current = rowStart; current < rowEnd; current++) {
      bytes.push(memory.read(address(current)));
    }

    rows.push({
      address: address(rowStart),
      bytes,
    });
  }

  return {
    startAddress,
    endAddress: address(endExclusive - 1),
    rows,
  };
}

/**
 * Returns the preceding 64-byte page start, clamped to address zero.
 */
export function previousMemoryPageStart(startAddress: Address): Address | undefined {
  if (startAddress === 0) {
    return undefined;
  }

  return address(Math.max(0, startAddress - MEMORY_PAGE_SIZE));
}

/**
 * Returns the next 64-byte page start.
 *
 * @remarks
 * Navigation clamps to the last full page where possible. Explicit address
 * entry can still inspect a smaller trailing range such as the final byte.
 */
export function nextMemoryPageStart(
  startAddress: Address,
  memorySize: number,
): Address | undefined {
  const lastFullPageStart = Math.max(0, memorySize - MEMORY_PAGE_SIZE);

  if (startAddress >= lastFullPageStart) {
    return undefined;
  }

  return address(Math.min(startAddress + MEMORY_PAGE_SIZE, lastFullPageStart));
}

/**
 * Presents a passive, live hexadecimal view over the active machine memory.
 *
 * @remarks
 * This component does not mutate memory or control machine execution. It owns
 * only memory-view navigation, address-entry validation, and DOM rendering.
 */
export class WebMemoryPanel {
  private readonly document: Document;

  private readonly range: HTMLElement;
  private readonly form: HTMLFormElement;
  private readonly addressInput: HTMLInputElement;
  private readonly goButton: HTMLButtonElement;
  private readonly validation: HTMLElement;
  private readonly empty: HTMLElement;
  private readonly table: HTMLTableElement;
  private readonly tableBody: HTMLTableSectionElement;
  private readonly previousButton: HTMLButtonElement;
  private readonly nextButton: HTMLButtonElement;
  private readonly programCounterButton: HTMLButtonElement;
  private readonly indexRegisterButton: HTMLButtonElement;

  private memory: Memory | undefined;
  private references: MemoryReferenceAddresses | undefined;
  private startAddress: Address = address(0);

  public constructor(root: HTMLElement) {
    this.document = root.ownerDocument;

    this.range = requireDescendant(root, "#memory-range");
    this.form = requireDescendant<HTMLFormElement>(root, "#memory-form");
    this.addressInput = requireDescendant<HTMLInputElement>(root, "#memory-address");
    this.goButton = requireDescendant<HTMLButtonElement>(root, "#memory-go-button");
    this.validation = requireDescendant(root, "#memory-validation");
    this.empty = requireDescendant(root, "#memory-empty");
    this.table = requireDescendant<HTMLTableElement>(root, "#memory-table");
    this.tableBody = requireDescendant<HTMLTableSectionElement>(root, "#memory-table-body");
    this.previousButton = requireDescendant<HTMLButtonElement>(root, "#memory-previous-button");
    this.nextButton = requireDescendant<HTMLButtonElement>(root, "#memory-next-button");
    this.programCounterButton = requireDescendant<HTMLButtonElement>(
      root,
      "#memory-program-counter-button",
    );
    this.indexRegisterButton = requireDescendant<HTMLButtonElement>(
      root,
      "#memory-index-register-button",
    );

    this.form.addEventListener("submit", (event) => {
      event.preventDefault();
      this.goToInputAddress();
    });

    this.previousButton.addEventListener("click", () => {
      const previous = previousMemoryPageStart(this.startAddress);

      if (previous !== undefined) {
        this.showAddress(previous);
      }
    });

    this.nextButton.addEventListener("click", () => {
      if (this.memory === undefined) {
        return;
      }

      const next = nextMemoryPageStart(this.startAddress, this.memory.size);

      if (next !== undefined) {
        this.showAddress(next);
      }
    });

    this.programCounterButton.addEventListener("click", () => {
      const target = this.references?.programCounter;

      if (target !== undefined && this.canShowAddress(target)) {
        this.showAddress(target);
      }
    });

    this.indexRegisterButton.addEventListener("click", () => {
      const target = this.references?.indexRegister;

      if (target !== undefined && this.canShowAddress(target)) {
        this.showAddress(target);
      }
    });

    this.render();
  }

  /**
   * Selects the active memory source.
   *
   * When `initialAddress` is omitted, the current view position is preserved
   * where possible. This lets profile recomposition replace the machine
   * without unexpectedly moving the user's memory view.
   */
  public setMemory(memory: Memory | undefined, initialAddress?: Address): void {
    this.memory = memory;

    if (memory === undefined) {
      this.references = undefined;
      this.startAddress = address(0);
      this.addressInput.value = "";
      this.clearValidation();
      this.render();

      return;
    }

    if (initialAddress !== undefined) {
      if (initialAddress >= memory.size) {
        throw new RangeError(
          `Memory inspection start ${formatAddress(initialAddress)} is outside ` +
            "the address space.",
        );
      }

      this.startAddress = initialAddress;
    } else if (this.startAddress >= memory.size) {
      this.startAddress = address(Math.max(0, memory.size - MEMORY_PAGE_SIZE));
    }

    this.syncAddressInput();
    this.clearValidation();
    this.render();
  }

  /**
   * Updates the CPU-derived addresses offered as quick navigation targets.
   *
   * References may be outside the active memory range (for example SCHIP-
   * MODERN can let I advance beyond memory); such targets remain visible in
   * their tooltip but are disabled rather than coerced.
   */
  public setReferenceAddresses(references: MemoryReferenceAddresses | undefined): void {
    this.references = references;
    this.renderReferenceButtons();
  }

  /**
   * Moves the view to an exact address and renders it immediately.
   */
  public showAddress(targetAddress: Address): void {
    if (this.memory === undefined) {
      return;
    }

    if (targetAddress >= this.memory.size) {
      throw new RangeError(
        `Memory inspection start ${formatAddress(targetAddress)} is outside the address space.`,
      );
    }

    this.startAddress = targetAddress;
    this.syncAddressInput();
    this.clearValidation();
    this.render();
  }

  /**
   * Refreshes the currently visible bytes without disturbing address text the
   * user may be editing.
   */
  public render(): void {
    const memory = this.memory;
    const hasMemory = memory !== undefined;

    this.addressInput.disabled = !hasMemory;
    this.goButton.disabled = !hasMemory;
    this.renderReferenceButtons();

    if (memory === undefined) {
      this.range.textContent = "—";
      this.empty.hidden = false;
      this.empty.textContent = "Load a ROM to inspect memory.";
      this.table.hidden = true;
      this.tableBody.replaceChildren();
      this.previousButton.disabled = true;
      this.nextButton.disabled = true;

      return;
    }

    const page = inspectMemoryPage(memory, this.startAddress);

    this.range.textContent = `${formatAddress(page.startAddress)}–${
      formatAddress(
        page.endAddress,
      )
    }`;
    this.empty.hidden = true;
    this.table.hidden = false;
    this.tableBody.replaceChildren();

    const fragment = this.document.createDocumentFragment();

    for (const row of page.rows) {
      const tableRow = this.document.createElement("tr");

      const addressCell = this.document.createElement("th");
      addressCell.scope = "row";
      addressCell.className = "memory-row-address code-text";
      addressCell.textContent = formatAddress(row.address);
      tableRow.append(addressCell);

      for (let column = 0; column < MEMORY_ROW_SIZE; column++) {
        const byteCell = this.document.createElement("td");
        byteCell.className = "memory-byte code-text";

        const value = row.bytes[column];

        if (value === undefined) {
          byteCell.textContent = "";
          byteCell.dataset.empty = "true";
        } else {
          byteCell.textContent = value.toString(16).padStart(2, "0").toUpperCase();
        }

        tableRow.append(byteCell);
      }

      const charactersCell = this.document.createElement("td");
      charactersCell.className = "memory-characters code-text";
      charactersCell.textContent = formatMemoryCharacters(row.bytes);
      tableRow.append(charactersCell);

      fragment.append(tableRow);
    }

    this.tableBody.append(fragment);

    this.previousButton.disabled = previousMemoryPageStart(this.startAddress) === undefined;
    this.nextButton.disabled =
      nextMemoryPageStart(this.startAddress, memory.size) === undefined;
  }

  private renderReferenceButtons(): void {
    this.renderReferenceButton(
      this.programCounterButton,
      "PC",
      this.references?.programCounter,
    );
    this.renderReferenceButton(this.indexRegisterButton, "I", this.references?.indexRegister);
  }

  private renderReferenceButton(
    button: HTMLButtonElement,
    label: string,
    target: Address | undefined,
  ): void {
    const hasTarget = target !== undefined;
    const available = hasTarget && this.canShowAddress(target);

    button.disabled = !available;

    if (!hasTarget) {
      button.title = `Jump to ${label}`;
      button.setAttribute("aria-label", `Jump to ${label}`);
      return;
    }

    const formatted = formatAddress(target);
    const suffix = available ? "" : " (outside memory)";
    const description = `Jump to ${label} ${formatted}${suffix}`;

    button.title = description;
    button.setAttribute("aria-label", description);
  }

  private canShowAddress(target: Address): boolean {
    return this.memory !== undefined && target < this.memory.size;
  }

  private goToInputAddress(): void {
    if (this.memory === undefined) {
      return;
    }

    const parsed = parseMemoryAddress(this.addressInput.value, this.memory.size);

    if (parsed.outcome === "failure") {
      this.showValidation(parsed.message);

      return;
    }

    this.startAddress = parsed.address;
    this.syncAddressInput();
    this.clearValidation();
    this.render();
  }

  private syncAddressInput(): void {
    this.addressInput.value = formatAddress(this.startAddress);
  }

  private showValidation(message: string): void {
    this.validation.textContent = message;
    this.validation.hidden = false;
    this.addressInput.setAttribute("aria-invalid", "true");
  }

  private clearValidation(): void {
    this.validation.textContent = "";
    this.validation.hidden = true;
    this.addressInput.removeAttribute("aria-invalid");
  }
}

function formatAddress(value: Address): string {
  return `0x${value.toString(16).toUpperCase().padStart(3, "0")}`;
}

function requireDescendant<T extends Element = HTMLElement>(
  root: ParentNode,
  selector: string,
): T {
  const element = root.querySelector<T>(selector);

  if (element === null) {
    throw new Error(`Required memory panel element not found: ${selector}`);
  }

  return element;
}
