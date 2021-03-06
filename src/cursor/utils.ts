import type t from "@babel/types";

import { getNodeFromPath } from "../ast-utils";
import { Range } from "../utils";

export function selectNode(node: t.Node | t.Node[]) {
  return Array.isArray(node)
    ? new Range(node[0].start!, node[node.length - 1].end!)
    : new Range(node.start!, node.end!);
}

export const selectNodeFromPath = (
  ...params: Parameters<typeof getNodeFromPath>
) => selectNode(getNodeFromPath(...params));

export function selectOperator(
  node: t.LogicalExpression | t.BinaryExpression,
  source: string
) {
  const start =
    node.left.end! +
    source.slice(node.left.end!, node.right.start!).indexOf(node.operator);
  return new Range(start!, start + node.operator.length);
}

const selectName = ({ start, name }: t.Identifier) =>
  new Range(start!, start! + name.length);

export const selectNameFromPath = (
  ...params: Parameters<typeof getNodeFromPath>
) => selectName(getNodeFromPath(...params) as t.Identifier);

export const selectKind = ({ start, kind }: t.VariableDeclaration) =>
  new Range(start!, start! + kind.length);
