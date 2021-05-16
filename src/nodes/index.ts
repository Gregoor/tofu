import * as t from "@babel/types";

import { getLineage } from "../ast-utils";
import { Code } from "../code";
import { Change, Range, SelectionContext } from "../utils";
import { Expression, expressions } from "./expressions";
import { patterns } from "./patterns";
import { Statement, statements } from "./statements";
import { NodeDef, NodeDefs } from "./utils";

export const nodeDefs: NodeDefs = {
  ...expressions,
  ...statements,
  ...patterns,
};

export const findNodeSlot: (
  params: SelectionContext<t.Node>
) => null | Range = (params) => {
  const {
    node,
    cursor: { start },
  } = params;
  const nodeDef = nodeDefs[node.type];
  if (nodeDef && "hasSlot" in nodeDef && nodeDef.hasSlot) {
    const slot = nodeDef.hasSlot(params as any);
    if (slot) {
      return slot instanceof Range ? slot : new Range(start);
    }
  }

  for (const NodeKind of [Expression, Statement]) {
    if (NodeKind.isKindOf(params)) {
      const slot = NodeKind.hasSlot(params as any);

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
  for (const [node, path] of reverseLineage) {
    const nodeDef = nodeDefs[node.type] as NodeDef<t.Node>;
    const change = nodeDef?.onInput?.({ node, path, code, cursor }, data);
    if (change) {
      return change;
    }
  }
  return null;
}
