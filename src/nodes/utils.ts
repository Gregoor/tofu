import * as t from "@babel/types";

import { getNode, getNodeFromPath } from "../ast-utils";
import { Code } from "../code";
import { selectNodeFromPath } from "../cursor/utils";
import { Change, DetailAction, Range } from "../utils";

export type NodeHasSlot<T> = (
  node: T,
  start: number,
  code: Code
) => boolean | Range;

export type NodeActionParams<T> = {
  node: T;
  path: (string | number)[];
  leafNode: t.Node;
  cursor: Range;
  code: Code;
};

export type OnNodeInput<T> = (
  params: NodeActionParams<T>,
  data: string
) => false | Change;

export type NodeDef<T extends t.Node> = {
  hasSlot?: NodeHasSlot<T>;
  actions?: DetailAction<T>[];
  onInput?: OnNodeInput<T>;
};

export type NodeDefs = Partial<
  {
    [T in t.Node["type"] | "Expression" | "Statement"]: T extends "Expression"
      ? NodeDef<t.Expression>
      : T extends "Statement"
      ? NodeDef<t.Statement>
      : NodeDef<Extract<t.Node, { type: T }>>;
  }
>;

export function findSlotIndex(collection: any[], start: number) {
  let index = collection.findIndex((n) => n && n.start > start);
  if (index == -1) {
    index = collection.length;
  }
  return index;
}

export const addElementAction = (
  collectionKey: string,
  initialValue: t.Node
): DetailAction<t.Node> => ({
  id: "addElement",
  if: ({ node, leafNode, cursor: { start, end } }) =>
    !(
      start <= node.start! ||
      end >= node.end! ||
      (t.isStringLiteral(leafNode) && start < leafNode.end!) ||
      t.isTemplateElement(leafNode) ||
      (t.isIdentifier(leafNode) &&
        start > leafNode.start! &&
        start < leafNode.end!)
    ),
  on: "[Comma]",
  do: ({ node, path, code, cursor: { start, end } }) => {
    let index = findSlotIndex((node as any)[collectionKey], start);
    if (
      (start == node.start && end == node.start) ||
      getNode(code.ast, start).start == start
    ) {
      index = Math.max(0, index - 1);
    }

    return {
      ast(ast) {
        const collection = getNodeFromPath(ast, path) as any;
        collection[collectionKey].splice(index, 0, initialValue);
      },
      cursor: ({ ast }) =>
        selectNodeFromPath(ast, [...path, collectionKey, index]),
    };
  },
});
