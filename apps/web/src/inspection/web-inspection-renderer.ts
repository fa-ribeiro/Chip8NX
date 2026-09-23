import type { Address } from "@chip8nx/core";

import type {
  InstructionTraceRowViewModel,
  NearbyInstructionViewModel,
  WebInspectionViewModel,
} from "./web-inspection-view-model.ts";

export interface WebInspectionRendererOptions {
  /** Called when the user toggles breakpoint presence from the instruction gutter. */
  readonly onBreakpointToggle?: (address: Address) => void;
}

/**
 * Presents CHIP-8 inspection state in the Web host and forwards optional
 * presentation-level debugger interactions to its owner.
 */
export class WebInspectionRenderer {
  private readonly document: Document;

  private readonly registerValues: ReadonlyMap<string, HTMLElement>;

  private readonly indexRegister: HTMLElement;
  private readonly programCounter: HTMLElement;
  private readonly delayTimer: HTMLElement;
  private readonly soundTimer: HTMLElement;
  private readonly stack: HTMLElement;
  private readonly stackCount: HTMLElement;

  private readonly nearbyInstructionsEmpty: HTMLElement;
  private readonly nearbyInstructionsList: HTMLOListElement;

  private readonly instructionHistoryEmpty: HTMLElement;
  private readonly instructionHistoryList: HTMLOListElement;

  public constructor(
    root: HTMLElement,
    private readonly options: WebInspectionRendererOptions = {},
  ) {
    this.document = root.ownerDocument;

    this.registerValues = this.collectRegisterValues(root);

    this.indexRegister = requireDescendant(root, "#cpu-index-register");

    this.programCounter = requireDescendant(root, "#cpu-program-counter");

    this.delayTimer = requireDescendant(root, "#cpu-delay-timer");

    this.soundTimer = requireDescendant(root, "#cpu-sound-timer");

    this.stack = requireDescendant(root, "#cpu-stack");
    this.stackCount = requireDescendant(root, "#cpu-stack-count");

    this.nearbyInstructionsEmpty = requireDescendant(root, "#nearby-instructions-empty");

    this.nearbyInstructionsList = requireDescendant<HTMLOListElement>(
      root,
      "#nearby-instructions-list",
    );

    this.instructionHistoryEmpty = requireDescendant(root, "#instruction-history-empty");

    this.instructionHistoryList = requireDescendant<HTMLOListElement>(
      root,
      "#instruction-history-list",
    );
  }

  public render(viewModel: WebInspectionViewModel | undefined): void {
    if (viewModel === undefined) {
      this.renderNoMachine();

      return;
    }

    this.renderCpuState(viewModel);
    this.renderNearbyInstructions(viewModel.nearbyInstructions);
    this.renderInstructionHistory(viewModel.traces);
  }

  private renderNoMachine(): void {
    /*
     * Keep the CPU shape visible even before a machine session exists. This is
     * a neutral presentation baseline, not a fabricated execution snapshot.
     */
    for (const element of this.registerValues.values()) {
      element.textContent = "0x00";
    }

    this.indexRegister.textContent = "0x000";
    this.programCounter.textContent = "0x000";
    this.delayTimer.textContent = "0x00";
    this.soundTimer.textContent = "0x00";
    this.stack.textContent = "—";
    this.stackCount.textContent = "-/-";

    this.nearbyInstructionsEmpty.hidden = false;
    this.nearbyInstructionsList.replaceChildren();

    this.instructionHistoryEmpty.hidden = false;
    this.instructionHistoryList.replaceChildren();
  }

  private renderCpuState(viewModel: WebInspectionViewModel): void {
    for (const register of viewModel.cpu.registers) {
      const element = this.registerValues.get(register.name);

      if (element === undefined) {
        throw new Error(`Missing inspection element for register ${register.name}`);
      }

      element.textContent = register.value;
    }

    this.indexRegister.textContent = viewModel.cpu.indexRegister;
    this.programCounter.textContent = viewModel.cpu.programCounter;

    this.delayTimer.textContent = viewModel.cpu.delayTimer;
    this.soundTimer.textContent = viewModel.cpu.soundTimer;

    this.renderStack(viewModel.cpu.stack, viewModel.cpu.stackCapacity);
  }

  private renderStack(stack: readonly string[], capacity: number): void {
    this.stackCount.textContent = `${stack.length}/${capacity}`;
    this.stack.textContent = stack.length === 0 ? "—" : stack.join(" · ");
  }

  private renderNearbyInstructions(instructions: readonly NearbyInstructionViewModel[]): void {
    this.nearbyInstructionsList.replaceChildren();

    if (instructions.length === 0) {
      this.nearbyInstructionsEmpty.hidden = false;

      return;
    }

    this.nearbyInstructionsEmpty.hidden = true;

    const fragment = this.document.createDocumentFragment();

    for (const instruction of instructions) {
      const item = this.document.createElement("li");

      item.className = "nearby-instruction-row";
      item.dataset.current = String(instruction.current);
      item.dataset.availability = instruction.content.availability;

      if (instruction.current) {
        item.setAttribute("aria-current", "true");
      }

      const breakpointMarker = this.document.createElement("button");
      breakpointMarker.type = "button";
      breakpointMarker.className = "nearby-instruction-breakpoint-marker";
      breakpointMarker.dataset.breakpoint = instruction.breakpoint;

      const hasBreakpoint = instruction.breakpoint !== "none";
      const breakpointAction = hasBreakpoint ? "Remove" : "Add";
      const breakpointLabel = `${breakpointAction} breakpoint at ${instruction.address}`;

      breakpointMarker.setAttribute("aria-label", breakpointLabel);
      breakpointMarker.title = breakpointLabel;
      breakpointMarker.disabled = this.options.onBreakpointToggle === undefined;

      breakpointMarker.addEventListener("click", () => {
        this.options.onBreakpointToggle?.(instruction.addressValue);
      });

      const currentMarker = this.document.createElement("span");
      currentMarker.className = "nearby-instruction-current-marker";
      currentMarker.textContent = instruction.current ? "▶" : "";
      currentMarker.setAttribute("aria-hidden", "true");

      const instructionAddress = this.document.createElement("span");
      instructionAddress.className = "nearby-instruction-address";
      instructionAddress.textContent = instruction.address;

      item.append(breakpointMarker, currentMarker, instructionAddress);

      if (instruction.content.availability === "available") {
        const opcode = this.document.createElement("span");
        opcode.className = "nearby-instruction-opcode";
        opcode.textContent = instruction.content.opcode;

        const text = this.document.createElement("span");
        text.className = "nearby-instruction-text";
        text.textContent = instruction.content.text;

        item.append(opcode, text);
      } else {
        const reason = this.document.createElement("span");
        reason.className = "nearby-instruction-text";
        reason.textContent = instruction.content.reason;

        item.append(reason);
      }

      fragment.append(item);
    }

    this.nearbyInstructionsList.append(fragment);
  }

  private renderInstructionHistory(traces: readonly InstructionTraceRowViewModel[]): void {
    const followLatest = this.isFollowingLatestInstruction();

    this.instructionHistoryList.replaceChildren();

    if (traces.length === 0) {
      this.instructionHistoryEmpty.hidden = false;

      return;
    }

    this.instructionHistoryEmpty.hidden = true;

    const fragment = this.document.createDocumentFragment();

    for (const trace of traces) {
      const item = this.document.createElement("li");
      const code = this.document.createElement("code");

      item.dataset.outcome = trace.outcome;
      code.textContent = trace.text;

      item.append(code);
      fragment.append(item);
    }

    this.instructionHistoryList.append(fragment);

    if (followLatest) {
      this.instructionHistoryList.scrollTop = this.instructionHistoryList.scrollHeight;
    }
  }

  private isFollowingLatestInstruction(): boolean {
    const distanceFromBottom = this.instructionHistoryList.scrollHeight -
      this.instructionHistoryList.scrollTop -
      this.instructionHistoryList.clientHeight;

    return distanceFromBottom <= 4;
  }

  private collectRegisterValues(root: HTMLElement): ReadonlyMap<string, HTMLElement> {
    const values = new Map<string, HTMLElement>();

    for (const element of root.querySelectorAll<HTMLElement>("[data-register]")) {
      const register = element.dataset.register;

      if (register === undefined) {
        throw new Error("Inspection register element is missing data-register");
      }

      if (values.has(register)) {
        throw new Error(`Duplicate inspection element for register ${register}`);
      }

      values.set(register, element);
    }

    return values;
  }
}

function requireDescendant<T extends Element = HTMLElement>(
  root: ParentNode,
  selector: string,
): T {
  const element = root.querySelector<T>(selector);

  if (element === null) {
    throw new Error(`Required inspection element not found: ${selector}`);
  }

  return element;
}
