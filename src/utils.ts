import t from "@babel/types";

import { Code } from "./code";

export const modifierKeys = [
  "altKey",
  "ctrlKey",
  "metaKey",
  "shiftKey",
] as const;

type Modifiers = Partial<Record<typeof modifierKeys[number], boolean>>;

type KeyConfig = ({ code: string } | { key: string }) & Modifiers;

export type BareChange<C> =
  | {
      code: Code;
      cursor?: Range | ((code: C, cursor: Range) => Range);
      skipFormatting?: true;
    }
  | { cursor: Range }
  | { rangeSelect: Direction }
  | { history: "UNDO" | "REDO" };

export type Change = BareChange<Code>;

export type BareAction<C> = (
  code: C,
  cursor: Range
) => undefined | null | BareChange<C>;

export type Action = BareAction<Code>;

export type BareDetailAction<C> = {
  info?: any;
  on?: KeyConfig | KeyConfig[];
  do: BareAction<C>;
};

export type DetailAction = BareDetailAction<Code>;

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

  equals(other: Range | t.Node) {
    return this.start == other.start! && this.end == other.end!;
  }

  toString = () =>
    this._end == null ? this.start : this.start + " - " + this._end;
}
