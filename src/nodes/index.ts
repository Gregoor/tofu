import * as t from "@babel/types";

import { getLineage } from "../ast-utils";
import { Code } from "../code";
import { Change, Range } from "../utils";
import { expressions } from "./expressions";
import { patterns } from "./patterns";
import { statements } from "./statements";
import { NodeDef, NodeDefs, NodeHasSlot } from "./utils";

export const nodeDefs: NodeDefs = {
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
    [t.isExpression, expressions.Expression!.hasSlot],
    [t.isStatement, statements.Statement!.hasSlot],
  ] as const) {
    if (typeCheck(node)) {
      const slot = slotCheck && slotCheck(node as any, start, code);
      if (slot) {
        return slot instanceof Range ? slot : new Range(start);
      }
    }
  }
  return null;
};

export function handleNodeInput(
  code: Code,
  cursor: Range,
  data: string
): null | Change {
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
