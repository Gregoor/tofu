import * as t from "@babel/types";

import { getNode, getNodeFromPath, getParentsAndPathTD } from "../ast-utils";
import { selectKind, selectNode, selectOperator } from "../cursor/utils";
import { CodeWithAST } from "../history";
import { Range } from "../utils";
import { expression, expressions } from "./expressions";
import { statements } from "./statements";
import {
  NodeAction,
  NodeActionParams,
  NodeActions,
  NodeDefs,
  NodeHasSlot,
} from "./utils";

const nodeDefs: NodeDefs = {
  BooleanLiteral: { hasSlot: selectNode },
  NullLiteral: { hasSlot: selectNode },
  StringLiteral: { hasSlot: (node, start) => node.start !== start },

  BinaryExpression: {
    hasSlot(node, start, { code }) {
      const operator = selectOperator(node, code);
      return operator.includes(start) ? operator : false;
    },
  },
  LogicalExpression: {
    hasSlot(node, start, { code }) {
      const operator = selectOperator(node, code);
      return operator.includes(start) ? operator : false;
    },
  },

  VariableDeclaration: {
    // hasSlot(node, start) {
    //   const kindRange = new Range(node.start, node.start + node.kind.length);
    //   return kindRange.includes(start);
    // },
    actions: ({ node, codeWithAST }) =>
      (["const", "let", "var"] as const)
        .filter((kind) => node.kind != kind)
        .map((kind) => ({
          info: { type: "CHANGE_DECLARATION_KIND", kind },
          on: { code: "Key" + kind[0].toUpperCase() },
          do: () => ({
            codeWithAST: codeWithAST.replaceCode(
              new Range(node.start, node.start + node.kind.length),
              kind
            ),
            nextCursor: ({ ast }, { start }) =>
              selectKind(getNode(ast, start) as typeof node),
          }),
        })),
  },
  VariableDeclarator: {
    actions: ({ node, path, codeWithAST, cursor }) =>
      node.init && {
        on: { code: "Space" },
        do: () => ({
          codeWithAST: codeWithAST.replaceCode(new Range(cursor.end), "= null"),
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
) => false | Range = (node, start, codeWithAST) => {
  const nodeDef = nodeDefs[node.type];
  if (nodeDef && "hasSlot" in nodeDef) {
    const slot = nodeDef.hasSlot(node as any, start, codeWithAST);
    if (slot) {
      return slot instanceof Range ? slot : new Range(start);
    }
  }
  return false;
};

const flattenActions = (actions: NodeActions): NodeAction[] =>
  (Array.isArray(actions) ? actions : [actions]).flat(Infinity);

export const findNodeActions: (
  codeWithAST: CodeWithAST,
  cursor: Range
) => { node: t.Node; actions: NodeAction[] }[] = (codeWithAST, cursor) => {
  const [parents, path] = getParentsAndPathTD(codeWithAST.ast, cursor.start);
  return (Array.isArray(parents) ? parents : [])
    .slice(2)
    .reverse()
    .filter((node) => node.start <= cursor.start && node.end >= cursor.end)
    .map((node, i) => {
      const nodeDef = nodeDefs[node.type];
      const params = {
        node,
        path: path.slice(0, i),
        codeWithAST,
        cursor,
      };
      return Array.isArray(node)
        ? null
        : {
            node,
            actions: [
              ...(t.isExpression(node)
                ? flattenActions(expression.actions(params))
                : []),
              ...(nodeDef && nodeDef.actions
                ? flattenActions(nodeDef.actions(params))
                : []),
            ].filter((a) => !!a),
          };
    })
    .filter((e) => e.node && e.actions.length > 0);
};
