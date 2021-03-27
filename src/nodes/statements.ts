import * as t from "@babel/types";

import { getNode, getNodeFromPath } from "../ast-utils";
import { selectKind, selectNode, selectNodeFromPath } from "../cursor/utils";
import { DetailAction, Range } from "../utils";
import { expressions } from "./expressions";
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

const isAtElseEnd = (node: t.IfStatement, start: number) =>
  node.alternate && node.alternate.end == start;

export const statements: NodeDefs = {
  Statement: {
    hasSlot: (node, start) =>
      (t.isIfStatement(node) || t.isFor(node) || t.isDeclaration(node)) &&
      start == node.start,
  },

  // Program: {
  //   actions: [
  //     ...["[]", "{}", "''", '""'].map(
  //       (pair) =>
  //         ({
  //           id: ["wrap", pair],
  //           on: pair[0],
  //           if: ({ leafNode, cursor }) =>
  //             !(t.isStringLiteral(leafNode) && leafNode.end! > cursor.start),
  //           do: ({ cursor }) => ({
  //             sourceReplace: [cursor, `(${pair})`],
  //             cursor: ({ ast }, { start }) =>
  //               new Range(getNode(ast, start).start! + 1),
  //           }),
  //         } as DetailAction<t.Program>)
  //     ),
  //     {
  //       id: "addArrowFunction",
  //       on: ">",
  //       do: ({ cursor }) => ({ sourceReplace: [cursor, `(() => null)`] }),
  //     },
  //     {
  //       // TODO: oops this is JSX, yet it lives here?
  //       id: "addJSXFragment",
  //       on: "<",
  //       do: ({ cursor }) => ({ sourceReplace: [cursor, `<></>`] }),
  //     },
  //   ],
  // },

  VariableDeclaration: {
    hasSlot(node, start) {
      const kindRange = selectKind(node);
      return kindRange.includes(start) ? kindRange : false;
    },
    actions: (["const", "let", "var"] as const).map((kind) => ({
      id: ["changeDeclarationKind", kind],
      on: kind[0],
      if: ({ node, cursor }) =>
        node.kind != kind && selectKind(node).equals(cursor),
      do: ({ node }) => ({
        sourceReplace: [
          new Range(node.start!, node.start! + node.kind.length),
          kind,
        ],
        cursor: ({ ast }, { start }) =>
          selectKind(getNode(ast, start) as typeof node),
      }),
    })),
  },
  VariableDeclarator: {
    actions: [
      {
        id: "assignVariable",
        if: ({ node, cursor }) => !node.init && cursor.start == node.id.end!,
        on: ["space", "Shift+;"],
        do: ({ node, path }) => ({
          sourceReplace: [new Range(node.end!), "= null"],
          cursor: ({ ast }) => selectNodeFromPath(ast, [...path, "init"]),
        }),
      },
    ],
  },

  BlockStatement: {
    hasSlot: (node, start) =>
      (node.body.length == 0 && node.start! + 1 == start) || node.end == start,
  },

  IfStatement: {
    hasSlot: (node, start, { source }) =>
      Boolean(
        isAtSingleIfEnd(node, start) ||
          isAtElse(node, start, source) ||
          isAtElseEnd(node, start)
      ),
    actions: [
      {
        id: "addElse",
        if: ({ node, cursor }) => isAtSingleIfEnd(node, cursor.start),
        on: "e",
        do: ({ node, path }) => ({
          sourceReplace: [new Range(node.end!), "else {}"],
          cursor: ({ ast }) =>
            new Range(
              (getNodeFromPath(ast, [...path, "alternate"]) as t.Node).start! -
                1
            ),
        }),
      },
      {
        id: "addElseIf",
        if: ({ node, cursor }) => isAtSingleIfEnd(node, cursor.start),
        on: "i",
        do: ({ node, path }) => ({
          sourceReplace: [new Range(node.end!), "else if (null) {}"],
          cursor: ({ ast }) =>
            selectNodeFromPath(ast, [...path, "alternate", "test"]),
        }),
      },

      {
        id: "changeElseToElseIf",
        if: ({ node, code, cursor }) =>
          isAtElse(node, cursor.start, code.source),
        on: "i",
        do: ({ cursor, path }) => ({
          sourceReplace: [cursor, " if (t)"],
          cursor: ({ ast }) =>
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
    actions: [
      {
        id: ["convert", "ForStatement"],
        on: "i",
        if: () => false,
        /**
         * from:
         * for ($kind $element of $list) $any
         * to:
         * for (let i = 0; i < $list.length; i++) {
         *     $kind $element = $list[i];
         *     ...$any
         * }
         */
        do: ({ node, path }) => ({
          ast(ast) {
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
          },
        }),
      },
    ],
  },

  FunctionDeclaration: expressions.FunctionExpression as any,

  ReturnStatement: {
    hasSlot: (node, start) => !node.argument && node.end! - 1 == start,
  },
};
