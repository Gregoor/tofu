import * as t from "@babel/types";

import { getLineage } from "../ast-utils";
import { ValidCode } from "../code";
import { BareChange, Range } from "../utils";
import { expression, expressions } from "./expressions";
import { patterns } from "./patterns";
import { statement, statements } from "./statements";
import {
  NodeDef,
  NodeDefs,
  NodeDetailAction,
  NodeHasSlot,
  flattenActions,
} from "./utils";

const nodeDefs: NodeDefs = {
  ...expressions,
  ...statements,
  ...patterns,
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

export const findNodeDetailActions: (
  code: ValidCode,
  cursor: Range
) => { node: t.Node; actions: NodeDetailAction[] }[] = (code, cursor) => {
  const reverseLineage = getLineage(code.ast, cursor.start).reverse();
  const leafNode = reverseLineage[0][0];
  return reverseLineage
    .map(([node, path]) => {
      const nodeDef = nodeDefs[node.type] as NodeDef<t.Node>;
      return {
        node,
        actions: [
          ...(nodeDef && nodeDef.actions
            ? flattenActions(
                nodeDef.actions({ node, leafNode, path, code, cursor })
              )
            : []),
          ...(t.isExpression(node) && expression.actions
            ? flattenActions(
                expression.actions({ node, leafNode, path, code, cursor })
              )
            : []),
        ].filter((a) => !!a),
      };
    })
    .filter((e) => e && e.node && e.actions.length > 0) as ReturnType<
    typeof findNodeDetailActions
  >;
};

export function handleNodeInput(
  code: ValidCode,
  cursor: Range,
  data: string
): null | BareChange<ValidCode> {
  const reverseLineage = getLineage(code.ast, cursor.start).reverse();
  const leafNode = reverseLineage[0][0];
  for (const [node, path] of reverseLineage) {
    const nodeDef = nodeDefs[node.type] as NodeDef<t.Node>;
    const change =
      nodeDef &&
      "onInput" in nodeDef &&
      nodeDef.onInput!({ node, leafNode, path, code, cursor }, data);
    if (change) {
      return change;
    }
  }
  return null;
}
