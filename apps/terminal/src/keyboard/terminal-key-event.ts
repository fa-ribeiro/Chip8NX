export type TerminalKeyEventType = "press" | "repeat" | "release";

export type TerminalKeyEventSource = "legacy" | "csi-u";

/**
 * Modifier state associated with a terminal key event.
 */
export interface TerminalKeyModifiers {
  readonly shift: boolean;
  readonly alt: boolean;
  readonly ctrl: boolean;
  readonly super: boolean;
  readonly hyper: boolean;
  readonly meta: boolean;
  readonly capsLock: boolean;
  readonly numLock: boolean;
}

/**
 * Semantic key event decoded from terminal input.
 *
 * Legacy terminals can only provide press-like events. CSI-u input can
 * additionally distinguish repeats and releases.
 */
export interface TerminalKeyEvent {
  readonly source: TerminalKeyEventSource;
  readonly type: TerminalKeyEventType;
  readonly character: string;
  readonly modifiers: TerminalKeyModifiers;
}
