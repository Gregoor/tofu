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
  BooleanLiteral: { hasSlot: selectNode },
  NullLiteral: { hasSlot: selectNode },
  StringLiteral: { hasSlot: (node, start) => node.start !== start },

  BinaryExpression: {
    hasSlot(node, start, { source }) {
      const operator = selectOperator(node, source);
      return operator.includes(start) ? operator : false;
    },
  },
  LogicalExpression: {
    hasSlot(node, start, { source }) {
      const operator = selectOperator(node, source);
      return operator.includes(start) ? operator : false;
    },
  },

  VariableDeclaration: {
    hasSlot(node, start) {
      const kindRange = selectKind(node);
      return kindRange.includes(start) ? kindRange : false;
    },
    actions: ({ node, code, cursor }) =>
      selectKind(node).equals(cursor)
        ? (["const", "let", "var"] as const)
            .filter((kind) => node.kind != kind)
            .map((kind) => ({
              info: { type: "CHANGE_DECLARATION_KIND", kind },
              on: { code: "Key" + kind[0].toUpperCase() },
              do: () => ({
                code: code.replaceSource(
                  new Range(node.start!, node.start! + node.kind.length),
                  kind
                ),
                nextCursor: ({ ast }, { start }) =>
                  selectKind(getNode(ast, start) as typeof node),
              }),
            }))
        : null,
  },
  VariableDeclarator: {
    actions: ({ node, path, code }) =>
      node.init && {
        on: { code: "Space" },
        do: () => ({
          code: code.replaceSource(new Range(node.end!), "= null"),
          nextCursor: ({ ast }) => selectNodeFromPath(ast, [...path, "init"]),
        }),
      },
  },

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
