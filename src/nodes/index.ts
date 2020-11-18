import t from "@babel/types";

import { getLineage, getNode } from "../ast-utils";
import { ValidCode } from "../code";
import {
  selectKind,
  selectNode,
  selectNodeFromPath,
  selectOperator,
} from "../cursor/utils";
import { Range } from "../utils";
import { expression, expressions } from "./expressions";
import { statements } from "./statements";
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
  if (t.isExpression(node)) {
    const slot = expression.hasSlot!(node, start, code);
    if (slot) {
      return slot instanceof Range ? slot : new Range(start);
    }
  }
  return null;
};

const flattenActions = (actions: NodeActions): NodeAction[] =>
  (Array.isArray(actions) ? actions : [actions]).flat(Infinity);

export const findNodeActions: (
  code: ValidCode,
  cursor: Range
) => { node: t.Node; actions: NodeAction[] }[] = (code, cursor) => {
  return getLineage(code.ast, cursor.start)
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
};
