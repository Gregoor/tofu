import * as t from "@babel/types";

import { getNode } from "../ast-utils";
import { CodeWithAST } from "../history";
import { Direction, Range } from "../utils";

type Modifiers = Partial<
  Record<"altKey" | "ctrlKey" | "metaKey" | "shiftKey", boolean | "optional">
>;

type KeyConfig = { key: string } & Modifiers;

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
export type Action = (modifiers: Record<keyof Modifiers, boolean>) => Change;
export type ActionCreator = (
  codeWithAST: CodeWithAST,
  cursor: Range
) => undefined | Action;

type ContextualActionCreator<F> = {
  info?: any; // F; // TODO: Something wrong with how TS infers those fields here, to be investiaged
  on: KeyConfig | KeyConfig[];
  do: ActionCreator;
};

export const buildActionCreators: <F extends { type: string }>(
  actions: ContextualActionCreator<F>[]
) => ContextualActionCreator<F>[] = (actions) => actions;

export const isMac = navigator.platform.startsWith("Mac");

export const withAST: (
  runFn: (codeWithAST: CodeWithAST, cursor: Range) => Action
) => ActionCreator = (runFn) => (codeWithAST, cursor) =>
  codeWithAST.ast ? runFn(codeWithAST, cursor) : null;

export const withNode: (
  runFn: (node: t.Node, codeWithAST: CodeWithAST, cursor: Range) => Action
) => ActionCreator = (runFn) =>
  withAST((codeWithAST, cursor) => {
    const node = getNode(codeWithAST.ast, cursor.start);
    return node ? runFn(node, codeWithAST, cursor) : undefined;
  });

export function findLastIndex(nodes: any[], check: (n) => boolean) {
  const reverseIndex = nodes.slice().reverse().findIndex(check);
  return reverseIndex < 0 ? -1 : nodes.length - 1 - reverseIndex;
}

export function findSlotIndex(collection, start: number) {
  let index = collection.findIndex((n) => n && n.start > start);
  if (index == -1) {
    index = collection.length;
  }
  return index;
}
