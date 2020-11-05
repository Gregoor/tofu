import type t from "@babel/types";

import { Range } from "../utils";

export function selectNode(node: t.Node | t.Node[]) {
  return Array.isArray(node)
    ? new Range(node[0].start, node[node.length - 1].end)
    : new Range(node.start, node.end);
}

export function selectOperator(
  node: t.LogicalExpression | t.BinaryExpression,
  code: string
) {
  const start =
    node.left.end +
    code.slice(node.left.end, node.right.start).indexOf(node.operator);
  return new Range(start, start + node.operator.length);
}

export const selectName = ({ start, name }: t.Identifier) =>
  new Range(start, start + name.length);

export const selectKind = ({ start, kind }: t.VariableDeclaration) =>
  new Range(start, start + kind.length);
