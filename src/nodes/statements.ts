import t from "@babel/types";

import { getNodeFromPath, getParentsAndPathTD } from "../ast-utils";
import { selectNode } from "../cursor/utils";
import { Range } from "../utils";
import { NodeDefs } from "./utils";

export const statements: NodeDefs = {
  // ExpressionStatement: { hasSlot: () => true },

  BlockStatement: {
    hasSlot: (node, start) => node.body.length == 0 && node.start! + 1 == start,
  },

  IfStatement: {
    hasSlot: (node, start, { source }) =>
      Boolean(
        (!node.alternate && node.consequent.end! == start) ||
          (node.alternate &&
            start ==
              node.consequent.end! +
                source
                  .slice(node.consequent.end!, node.alternate.start!)
                  .indexOf("else") +
                "else".length)
      ),
    actions: ({ node, path, cursor, code }) => [
      node.alternate
        ? {
            info: { type: "CHANGE_ELSE_TO_ELSE_IF" },
            on: { code: "KeyI" },
            do: () => ({
              code: code.replaceSource(cursor, " if (t)"),
              nextCursor: ({ ast }) =>
                selectNode(
                  getNodeFromPath(ast, [
                    ...getParentsAndPathTD(ast, cursor.start)[1],
                    "alternate",
                    "test",
                  ])
                ),
            }),
          }
        : [
            {
              info: { type: "ADD_ELSE" },
              on: { code: "KeyE" },
              do: () => ({
                code: code.replaceSource(cursor, "else {}"),
                nextCursor: ({ ast }) =>
                  new Range(
                    getNodeFromPath(ast, [...path.slice(0, -1), "alternate"])
                      .start! - 1
                  ),
              }),
            },
            {
              info: { type: "ADD_ELSE_IF" },
              on: { code: "KeyI" },
              do: () => ({
                code: code.replaceSource(
                  new Range(node.end!),
                  "else if(null) {}"
                ),
                nextCursor: ({ ast }) =>
                  selectNode(
                    getNodeFromPath(ast, [
                      ...path.slice(0, -1),
                      "alternate",
                      "test",
                    ])
                  ),
              }),
            },
          ],
    ],
  },

  ForStatement: {
    hasSlot: (node, start) => {
      const init = node.init ? node.init.end! : node.start! + 5;
      const test = node.test ? node.test.end! : init + (node.init ? 2 : 1);
      const update = node.update ? node.update.end : test + (node.test ? 2 : 1);

      return (
        (!node.init && start == init) ||
        (!node.test && start == test) ||
        (!node.update && start == update)
      );
    },
  },
  ForOfStatement: {
    actions: ({ node, path, code }) => ({
      info: { type: "CONVERT", from: "ForOfStatement", to: "ForStatement" },
      on: { code: "KeyO" },
      /**
       * from:
       * for ($kind $element of $list) $any
       * to:
       * for (let i = 0; i < $list.length; i++) {
       *     $kind $element = $list[i];
       *     ...$any
       * }
       */
      do: () => ({
        code: code.mutateAST((ast) => {
          const i = t.identifier("i");
          (getNodeFromPath(ast, path.slice(0, -1)) as any)[
            path[path.length - 1]
          ] = t.forStatement(
            t.variableDeclaration("let", [
              t.variableDeclarator(i, t.numericLiteral(0)),
            ]),
            t.binaryExpression(
              "<",
              i,
              t.memberExpression(node.right, t.identifier("length"))
            ),
            t.updateExpression("++", i),
            t.blockStatement([
              t.variableDeclaration("const", [
                t.variableDeclarator(
                  (node.left as t.VariableDeclaration).declarations[0].id,
                  t.memberExpression(node.right, i, true)
                ),
              ]),
              ...(node.body as t.BlockStatement).body,
            ])
          );
        }),
      }),
    }),
  },

  ReturnStatement: {
    hasSlot: (node, start) => !node.argument && node.end! - 1 == start,
  },
};
