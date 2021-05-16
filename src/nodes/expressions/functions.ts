import * as t from "@babel/types";
import pick from "lodash.pick";

import { getNode, getNodeFromPath } from "../../ast-utils";
import { Range } from "../../utils";
import { NodeDef, NodeDefs } from "../utils";

function asyncRange(node: t.FunctionExpression, start: number) {
  if (!node.async) {
    return null;
  }
  const range = new Range(node.start!, node.start! + "async".length);
  return range.includes(start) ? range : null;
}

export const FunctionExpression: NodeDef<t.FunctionExpression> = {
  hasSlot: ({ node, code, cursor: { start } }) =>
    asyncRange(node, start) ||
    start ==
      node.start! +
        code.source.slice(node.start!, node.body.start!).indexOf("function ") +
        "function ".length ||
    (node.params.length == 0 &&
      start ==
        node.start! +
          code.source.slice(node.start!, node.body.start!).indexOf("()") +
          1),
  actions: [
    {
      id: "makeAsync",
      if: ({ node }) => !node.async,
      on: {
        at: ({ node, cursor }) => node.start == cursor.start,
        char: "a",
      },

      do: ({ node, path }) => ({
        ast(ast) {
          (getNodeFromPath(ast, path) as typeof node).async = true;
        },
        cursor: (code, { start }) =>
          asyncRange(getNode(code.ast, start) as typeof node, start)!,
      }),
    },
  ],

  // actions: (params) => addElementAction(params, "params", t.identifier("p")),
};

export const functions: NodeDefs = {
  FunctionExpression,
  ArrowFunctionExpression: {
    hasSlot: ({ node, cursor }) =>
      node.params.length == 0 && node.start! + 1 == cursor.start,
    actions: [
      // cursor.start < node.body.start! &&
      //   addElementAction(
      //     { node, leafNode, path, code, cursor },
      //     "params",
      //     t.identifier("p")
      //   ),

      {
        id: ["convert", "FunctionExpression"],
        // on: "???",
        do: ({ node, path }) => ({
          ast(ast) {
            (getNodeFromPath(ast, path.slice(0, -1)) as any)[
              path[path.length - 1]
            ] = Object.assign(
              t.functionExpression(null, [], t.blockStatement([])),
              pick(node, "params", "async", "body")
            );
          },
        }),
      },
    ],
  },

  CallExpression: {
    hasSlot: ({ node, cursor }) =>
      node.arguments.length == 0 && node.end! - 1 == cursor.start,
    //   actions: ({ node, cursor, ...params }) =>
    //     cursor.start > node.callee.end! &&
    //     addElementAction(
    //       { node, cursor, ...params },
    //       "arguments",
    //       t.nullLiteral()
    //     ),
  },

  NewExpression: {
    hasSlot: ({ node, cursor }) => node.end! - 1 == cursor.start,
  },
};
