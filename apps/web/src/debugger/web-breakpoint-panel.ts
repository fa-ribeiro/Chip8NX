import {
  formatWebAddress,
  parseWebAddress,
  type WebAddressParseResult,
} from "../address/web-address.ts";
export { parseWebAddress as parseBreakpointAddress } from "../address/web-address.ts";
export type BreakpointAddressParseResult = WebAddressParseResult;

import { AddressBreakpoints } from "./address-breakpoints.ts";

/**
 * Presents and edits the Web debugger's configured address breakpoints.
 *
 * @remarks
 * Execution semantics remain in {@link AddressBreakpoints} and
 * `WebMachineLifecycle`. This component owns only breakpoint presentation,
 * address-entry validation, and forwarding explicit user edits to the model.
 */
export class WebBreakpointPanel {
  private readonly document: Document;

  private readonly count: HTMLElement;
  private readonly form: HTMLFormElement;
  private readonly addressInput: HTMLInputElement;
  private readonly addButton: HTMLButtonElement;
  private readonly validation: HTMLElement;
  private readonly empty: HTMLElement;
  private readonly list: HTMLUListElement;

  private memorySize: number | undefined;

  public constructor(
    root: HTMLElement,
    private readonly breakpoints: AddressBreakpoints,
    private readonly onBreakpointsChanged: () => void,
  ) {
    this.document = root.ownerDocument;

    this.count = requireDescendant(root, "#breakpoint-count");
    this.form = requireDescendant<HTMLFormElement>(root, "#breakpoint-form");
    this.addressInput = requireDescendant<HTMLInputElement>(root, "#breakpoint-address");
    this.addButton = requireDescendant<HTMLButtonElement>(root, "#breakpoint-add-button");
    this.validation = requireDescendant(root, "#breakpoint-validation");
    this.empty = requireDescendant(root, "#breakpoints-empty");
    this.list = requireDescendant<HTMLUListElement>(root, "#breakpoints-list");

    this.form.addEventListener("submit", (event) => {
      event.preventDefault();
      this.addFromInput();
    });

    this.render();
  }

  /**
   * Selects the active machine address space, or disables editing when no
   * machine is loaded.
   */
  public setMemorySize(memorySize: number | undefined): void {
    this.memorySize = memorySize;

    if (memorySize === undefined) {
      this.addressInput.value = "";
    }

    this.clearValidation();
    this.render();
  }

  /**
   * Renders the current configured breakpoint list.
   */
  public render(): void {
    const snapshot = this.breakpoints.snapshot();
    const hasMachine = this.memorySize !== undefined;

    this.count.textContent = String(snapshot.length);

    this.addressInput.disabled = !hasMachine;
    this.addButton.disabled = !hasMachine;

    this.list.replaceChildren();

    if (!hasMachine) {
      this.empty.hidden = false;
      this.empty.textContent = "Load a ROM to add breakpoints.";

      return;
    }

    if (snapshot.length === 0) {
      this.empty.hidden = false;
      this.empty.textContent = "No breakpoints.";

      return;
    }

    this.empty.hidden = true;

    const fragment = this.document.createDocumentFragment();

    for (const breakpoint of snapshot) {
      const item = this.document.createElement("li");
      item.className = "breakpoint-row";
      item.dataset.enabled = String(breakpoint.enabled);

      const toggleLabel = this.document.createElement("label");
      toggleLabel.className = "breakpoint-toggle";

      const toggle = this.document.createElement("input");
      toggle.type = "checkbox";
      toggle.checked = breakpoint.enabled;
      toggle.setAttribute(
        "aria-label",
        `${breakpoint.enabled ? "Disable" : "Enable"} breakpoint at ${
          formatWebAddress(
            breakpoint.address,
          )
        }`,
      );

      toggle.addEventListener("change", () => {
        this.breakpoints.setEnabled(breakpoint.address, toggle.checked);
        this.clearValidation();
        this.render();
        this.onBreakpointsChanged();
      });

      const marker = this.document.createElement("span");
      marker.className = "breakpoint-list-marker";
      marker.setAttribute("aria-hidden", "true");

      const breakpointAddress = this.document.createElement("code");
      breakpointAddress.textContent = formatWebAddress(breakpoint.address);

      toggleLabel.append(toggle, marker, breakpointAddress);

      const removeButton = this.document.createElement("button");
      removeButton.type = "button";
      removeButton.className = "breakpoint-remove-button";
      removeButton.textContent = "Remove";
      removeButton.setAttribute(
        "aria-label",
        `Remove breakpoint at ${formatWebAddress(breakpoint.address)}`,
      );

      removeButton.addEventListener("click", () => {
        this.breakpoints.remove(breakpoint.address);
        this.clearValidation();
        this.render();
        this.onBreakpointsChanged();
      });

      item.append(toggleLabel, removeButton);
      fragment.append(item);
    }

    this.list.append(fragment);
  }

  private addFromInput(): void {
    if (this.memorySize === undefined) {
      return;
    }

    const parsed = parseWebAddress(this.addressInput.value, this.memorySize);

    if (parsed.outcome === "failure") {
      this.showValidation(parsed.message);

      return;
    }

    if (!this.breakpoints.add(parsed.address)) {
      this.showValidation(`Breakpoint already exists at ${formatWebAddress(parsed.address)}.`);

      return;
    }

    this.addressInput.value = "";
    this.clearValidation();
    this.render();
    this.onBreakpointsChanged();
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

function requireDescendant<T extends Element = HTMLElement>(
  root: ParentNode,
  selector: string,
): T {
  const element = root.querySelector<T>(selector);

  if (element === null) {
    throw new Error(`Required breakpoint panel element not found: ${selector}`);
  }

  return element;
}
