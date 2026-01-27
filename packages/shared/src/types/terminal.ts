export interface TerminalSession {
  sessionId: string;
  piId: string;
  connectedAt: number;
}

export interface TerminalResize {
  cols: number;
  rows: number;
}
