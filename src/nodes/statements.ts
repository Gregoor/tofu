import t from "@babel/types";

import { getNode, getNodeFromPath } from "../ast-utils";
import { selectKind, selectNode, selectNodeFromPath } from "../cursor/utils";
import { Range } from "../utils";
import { NodeDefs } from "./utils";

const isAtSingleIfEnd = (node: t.IfStatement, start: number) =>
  !node.alternate && node.consequent.end! == start;
const isAtElse = (node: t.IfStatement, start: number, source: string) =>
  node.alternate &&
  start ==
    node.consequent.end! +
      source
        .slice(node.consequent.end!, node.alternate.start!)
        .indexOf("else") +
      "else".length;

export const statements: NodeDefs = {
  Program: {
    actions: ({ code, cursor }) =>
      ["[]", "{}"].map((pair) => ({
        on: { key: pair[0] },
        do: () => ({
          code: code.replaceSource(cursor, `(${pair})`),
          nextCursor: () => new Range(cursor.start + 1),
        }),
      })),
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
    actions: ({ node, path, code, cursor }) =>
      !node.init &&
      cursor.start == node.id.end! && {
        on: [{ code: "Space" }, { key: "=" }],
        do: () => ({
          code: code.replaceSource(new Range(node.end!), "= null"),
          nextCursor: ({ ast }) => selectNodeFromPath(ast, [...path, "init"]),
        }),
      },
  },

  BlockStatement: {
    hasSlot: (node, start) => node.body.length == 0 && node.start! + 1 == start,
  },

  IfStatement: {
    hasSlot: (node, start, { source }) =>
      Boolean(isAtSingleIfEnd(node, start) || isAtElse(node, start, source)),
    actions: ({ node, path, cursor, code }) => [
      isAtSingleIfEnd(node, cursor.start) && [
        {
          info: { type: "ADD_ELSE" },
          on: { code: "KeyE" },
          do: () => ({
            code: code.replaceSource(new Range(node.end!), "else {}"),
            nextCursor({ ast }) {
              return new Range(
                getNodeFromPath(ast, [...path, "alternate"]).start! - 1
              );
            },
          }),
        },
        {
          info: { type: "ADD_ELSE_IF" },
          on: { code: "KeyI" },
          do: () => ({
            code: code.replaceSource(new Range(node.end!), "else if (null) {}"),
            nextCursor: ({ ast }) =>
              selectNodeFromPath(ast, [...path, "alternate", "test"]),
          }),
        },
      ],
      isAtElse(node, cursor.start, code.source) && {
        info: { type: "CHANGE_ELSE_TO_ELSE_IF" },
        on: { code: "KeyI" },
        do: () => ({
          code: code.replaceSource(cursor, " if (t)"),
          nextCursor: ({ ast }) =>
            selectNode(getNodeFromPath(ast, [...path, "alternate", "test"])),
        }),
      },
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
