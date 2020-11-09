import { CodeWithAST } from "./history";

export type Change =
  | {
      codeWithAST?: CodeWithAST;
      cursor?: Range;
      skipFormatting?: true;
    }
  | {
      codeWithAST: CodeWithAST;
      nextCursor: (codeWithAST: CodeWithAST, cursor: Range) => Range;
    }
  | { rangeSelect: Direction }
  | { history: "UNDO" | "REDO" };

export type Direction = "LEFT" | "RIGHT" | "UP" | "DOWN" | null;

export class Range {
  start: number;
  private readonly _end: null | number;
  constructor(start: number, end: number = null) {
    this.start = start;
    this._end = end;
  }

  get end() {
    return this._end ?? this.start;
  }

  includes(pos: number): boolean {
    return pos >= this.start && pos <= this.end;
  }

  toString = () =>
    this._end == null ? this.start : this.start + " - " + this._end;
}

export const modifierKeys = [
  "altKey",
  "ctrlKey",
  "metaKey",
  "shiftKey",
] as const;

type Modifiers = Partial<Record<typeof modifierKeys[number], boolean>>;

export type KeyConfig = ({ code: string } | { key: string }) & Modifiers;
