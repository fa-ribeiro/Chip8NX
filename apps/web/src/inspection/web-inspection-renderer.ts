import type {
  InstructionTraceRowViewModel,
  NearbyInstructionViewModel,
  WebInspectionViewModel,
} from "./web-inspection-view-model.ts";

/**
 * Presents read-only CHIP-8 inspection state in the Web host.
 */
export class WebInspectionRenderer {
  private readonly document: Document;

  private readonly cpuStateEmpty: HTMLElement;
  private readonly cpuStateValues: HTMLElement;

  private readonly registerValues: ReadonlyMap<string, HTMLElement>;

  private readonly indexRegister: HTMLElement;
  private readonly programCounter: HTMLElement;
  private readonly delayTimer: HTMLElement;
  private readonly soundTimer: HTMLElement;
  private readonly stack: HTMLElement;

  private readonly nearbyInstructionsEmpty: HTMLElement;
  private readonly nearbyInstructionsList: HTMLOListElement;

  private readonly instructionHistoryEmpty: HTMLElement;
  private readonly instructionHistoryList: HTMLOListElement;

  public constructor(root: HTMLElement) {
    this.document = root.ownerDocument;

    this.cpuStateEmpty = requireDescendant(root, "#cpu-state-empty");

    this.cpuStateValues = requireDescendant(root, "#cpu-state-values");

    this.registerValues = this.collectRegisterValues(root);

    this.indexRegister = requireDescendant(root, "#cpu-index-register");

    this.programCounter = requireDescendant(root, "#cpu-program-counter");

    this.delayTimer = requireDescendant(root, "#cpu-delay-timer");

    this.soundTimer = requireDescendant(root, "#cpu-sound-timer");

    this.stack = requireDescendant(root, "#cpu-stack");

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
    this.cpuStateEmpty.hidden = false;
    this.cpuStateValues.hidden = true;

    this.nearbyInstructionsEmpty.hidden = false;
    this.nearbyInstructionsList.replaceChildren();

    this.instructionHistoryEmpty.hidden = false;
    this.instructionHistoryList.replaceChildren();
  }

  private renderCpuState(viewModel: WebInspectionViewModel): void {
    this.cpuStateEmpty.hidden = true;
    this.cpuStateValues.hidden = false;

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

    this.stack.textContent = viewModel.cpu.stack.length === 0
      ? "—"
      : viewModel.cpu.stack.join(" → ");
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

      const marker = this.document.createElement("span");
      marker.className = "nearby-instruction-marker";
      marker.textContent = instruction.current ? "▶" : "";
      marker.setAttribute("aria-hidden", "true");

      const instructionAddress = this.document.createElement("span");
      instructionAddress.className = "nearby-instruction-address";
      instructionAddress.textContent = instruction.address;

      item.append(marker, instructionAddress);

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
