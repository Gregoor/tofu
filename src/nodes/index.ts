import t from "@babel/types";

import { getLineage } from "../ast-utils";
import { ValidCode } from "../code";
import { Change, Range } from "../utils";
import { expression, expressions } from "./expressions";
import { statement, statements } from "./statements";
import {
  NodeAction,
  NodeActions,
  NodeDef,
  NodeDefs,
  NodeHasSlot,
} from "./utils";

const nodeDefs: NodeDefs = {
  ...expressions,
  ...statements,
};

export const findNodeSlot: (
  ...params: Parameters<NodeHasSlot<t.Node>>
) => null | Range = (node, start, code) => {
  const nodeDef = nodeDefs[node.type];
  if (nodeDef && "hasSlot" in nodeDef && nodeDef.hasSlot) {
    const slot = nodeDef.hasSlot(node as any, start, code);
    if (slot) {
      return slot instanceof Range ? slot : new Range(start);
    }
  }
  for (const [typeCheck, slotCheck] of [
    [t.isExpression, expression.hasSlot],
    [t.isStatement, statement.hasSlot],
  ] as const) {
    if (typeCheck(node)) {
      const slot = slotCheck!(node as any, start, code);
      if (slot) {
        return slot instanceof Range ? slot : new Range(start);
      }
    }
  }
  return null;
};

const flattenActions = (actions: NodeActions): NodeAction[] =>
  (Array.isArray(actions) ? actions : [actions]).flat(Infinity);

export const findNodeActions: (
  code: ValidCode,
  cursor: Range
) => { node: t.Node; actions: NodeAction[] }[] = (code, cursor) =>
  getLineage(code.ast, cursor.start)
    .reverse()
    .map(([node, path]) => {
      const nodeDef = nodeDefs[node.type] as NodeDef<t.Node>;
      return {
        node,
        actions: [
          ...(nodeDef && nodeDef.actions
            ? flattenActions(nodeDef.actions({ node, path, code, cursor }))
            : []),
          ...(t.isExpression(node) && expression.actions
            ? flattenActions(expression.actions({ node, path, code, cursor }))
            : []),
        ].filter((a) => !!a),
      };
    })
    .filter((e) => e && e.node && e.actions.length > 0) as ReturnType<
    typeof findNodeActions
  >;

export function handleNodeInput(
  code: ValidCode,
  cursor: Range,
  data: string
): null | Change<ValidCode> {
  for (const [node, path] of getLineage(code.ast, cursor.start).reverse()) {
    const nodeDef = nodeDefs[node.type] as NodeDef<t.Node>;
    const change =
      nodeDef &&
      "onInput" in nodeDef &&
      nodeDef.onInput!({ node, path, code, cursor }, data);
    if (change) {
      return change;
    }
  }
  return null;
}
