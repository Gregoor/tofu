import * as t from "@babel/types";

import { getNode, getNodeFromPath, getParentsAndPathTD } from "../ast-utils";
import { ValidCode } from "../code";
import { selectKind, selectNode, selectOperator } from "../cursor/utils";
import { Range } from "../utils";
import { expression, expressions } from "./expressions";
import { statements } from "./statements";
import { NodeAction, NodeActions, NodeDefs, NodeHasSlot } from "./utils";

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
    // hasSlot(node, start) {
    //   const kindRange = new Range(node.start, node.start + node.kind.length);
    //   return kindRange.includes(start);
    // },
    actions: ({ node, code }) =>
      (["const", "let", "var"] as const)
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
        })),
  },
  VariableDeclarator: {
    actions: ({ node, path, code, cursor }) =>
      node.init && {
        on: { code: "Space" },
        do: () => ({
          code: code.replaceSource(new Range(cursor.end), "= null"),
          nextCursor: ({ ast }) =>
            selectNode(getNodeFromPath(ast, path.concat("init"))),
        }),
      },
  },

  ...expressions,
  ...statements,
};

export const findNodeSlot: (
  ...params: Parameters<NodeHasSlot<t.Node>>
) => false | Range = (node, start, code) => {
  const nodeDef = nodeDefs[node.type];
  if (nodeDef && "hasSlot" in nodeDef && nodeDef.hasSlot) {
    const slot = nodeDef.hasSlot(node as any, start, code);
    if (slot) {
      return slot instanceof Range ? slot : new Range(start);
    }
  }
  return false;
};

const flattenActions = (actions: NodeActions): NodeAction[] =>
  (Array.isArray(actions) ? actions : [actions]).flat(Infinity);

export const findNodeActions: (
  code: ValidCode,
  cursor: Range
) => { node: t.Node; actions: NodeAction[] }[] = (code, cursor) => {
  const [parents, path] = getParentsAndPathTD(code.ast, cursor.start);
  return (Array.isArray(parents) ? parents : [])
    .slice(2)
    .reverse()
    .filter(
      (node) =>
        !Array.isArray(node) &&
        node.start! <= cursor.start &&
        node.end! >= cursor.end
    )
    .map((node, i) => {
      if (Array.isArray(node)) {
        return null;
      }
      const nodeDef = (nodeDefs as any)[node.type];
      return {
        node,
        actions: [
          ...(t.isExpression(node) && expression.actions
            ? flattenActions(
                expression.actions({
                  node,
                  path: path.slice(0, i),
                  code,
                  cursor,
                })
              )
            : []),
          ...(nodeDef && nodeDef.actions
            ? flattenActions(
                nodeDef.actions({ node, path: path.slice(0, i), code, cursor })
              )
            : []),
        ].filter((a) => !!a),
      };
    })
    .filter((e) => e && e.node && e.actions.length > 0) as ReturnType<
    typeof findNodeActions
  >;
};
