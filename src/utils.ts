import * as t from "@babel/types";

import { AST, Code } from "./code";
import { NodeActionParams } from "./nodes/utils";

export type CursorFn = (code: Code, cursor: Range) => Range;

export type Change =
  | ((
      | { ast: (ast: AST) => void }
      | { sourceReplace: [Range, string]; skipFormatting?: true }
      | { source: string }
    ) & {
      cursor?: CursorFn;
    })
  | { cursor: Range }
  | { rangeSelect: Direction };

export type Action<T extends t.Node> = (params: NodeActionParams<T>) => Change;

type ActionId = string | [string, string, ...string[]];

export type DetailAction<T extends t.Node> = {
  id: ActionId;
  if?: (params: NodeActionParams<T>) => any;
  on: string | [string, string, ...string[]];
  do: Action<T>;
};

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

  includes(pos: number | Range): boolean {
    return (pos instanceof Range ? [pos.start, pos.end] : [pos]).every(
      (pos) => pos >= this.start && pos <= this.end
    );
  }

  equals(other: Range | t.Node) {
    return this.start == other.start! && this.end == other.end!;
  }

  toString = () =>
    this._end == null ? this.start : this.start + " - " + this._end;
}

export const commandFromId = (nodeType: string | null, id: ActionId) =>
  [
    "tofu",
    ...(nodeType ? [nodeType] : []),
    ...(Array.isArray(id) ? id : [id]),
  ].join(":");
