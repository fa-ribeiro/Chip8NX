import type {
  CurrentInstructionViewModel,
  InstructionTraceRowViewModel,
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

  private readonly currentInstructionEmpty: HTMLElement;

  private readonly currentInstructionAvailable: HTMLElement;
  private readonly currentInstructionAddress: HTMLElement;
  private readonly currentInstructionOpcode: HTMLElement;
  private readonly currentInstructionText: HTMLElement;

  private readonly currentInstructionUnavailable: HTMLElement;
  private readonly currentInstructionUnavailableAddress: HTMLElement;
  private readonly currentInstructionUnavailableReason: HTMLElement;

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

    this.currentInstructionEmpty = requireDescendant(root, "#current-instruction-empty");

    this.currentInstructionAvailable = requireDescendant(
      root,
      "#current-instruction-available",
    );

    this.currentInstructionAddress = requireDescendant(root, "#current-instruction-address");

    this.currentInstructionOpcode = requireDescendant(root, "#current-instruction-opcode");

    this.currentInstructionText = requireDescendant(root, "#current-instruction-text");

    this.currentInstructionUnavailable = requireDescendant(
      root,
      "#current-instruction-unavailable",
    );

    this.currentInstructionUnavailableAddress = requireDescendant(
      root,
      "#current-instruction-unavailable-address",
    );

    this.currentInstructionUnavailableReason = requireDescendant(
      root,
      "#current-instruction-unavailable-reason",
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
    this.renderCurrentInstruction(viewModel.currentInstruction);
    this.renderInstructionHistory(viewModel.traces);
  }

  private renderNoMachine(): void {
    this.cpuStateEmpty.hidden = false;
    this.cpuStateValues.hidden = true;

    this.currentInstructionEmpty.hidden = false;
    this.currentInstructionAvailable.hidden = true;
    this.currentInstructionUnavailable.hidden = true;

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

  private renderCurrentInstruction(instruction: CurrentInstructionViewModel): void {
    this.currentInstructionEmpty.hidden = true;

    if (instruction.availability === "available") {
      this.currentInstructionAvailable.hidden = false;
      this.currentInstructionUnavailable.hidden = true;

      this.currentInstructionAddress.textContent = instruction.address;
      this.currentInstructionOpcode.textContent = instruction.opcode;
      this.currentInstructionText.textContent = instruction.text;

      return;
    }

    this.currentInstructionAvailable.hidden = true;
    this.currentInstructionUnavailable.hidden = false;

    this.currentInstructionUnavailableAddress.textContent = instruction.address;

    this.currentInstructionUnavailableReason.textContent = instruction.reason;
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
