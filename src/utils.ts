import { Code } from "./code";

export type Change<C> =
  | {
      code?: Code;
      cursor?: Range;
      skipFormatting?: true;
    }
  | {
      code: Code;
      nextCursor: (code: C, cursor: Range) => Range;
    }
  | { rangeSelect: Direction }
  | { history: "UNDO" | "REDO" };

export type Direction = "LEFT" | "RIGHT" | "UP" | "DOWN" | null;

export class Range {
  start: number;
  private readonly _end: null | number;

  constructor(start: number, end: number | null = null) {
    this.start = start;
    this._end = end;
  }

  get end() {
    return this._end ?? this.start;
  }

  isSingle() {
    return this.start == this.end;
  }

  includes(pos: number): boolean {
    return pos >= this.start && pos <= this.end;
  }

  equals(other: Range) {
    return this.start == other.start && this.end == other.end;
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

export function justLogErrorButInTheFutureThisWillNeedToReportToSentry(
  error: Error
) {
  console.error(error);
}
