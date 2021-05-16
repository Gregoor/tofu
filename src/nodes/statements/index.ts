import * as t from "@babel/types";

import { Path, getNode, getNodeFromPath } from "../../ast-utils";
import { selectKind, selectNode, selectNodeFromPath } from "../../cursor/utils";
import { Range } from "../../utils";
import { expressions } from "../expressions";
import { FunctionExpression } from "../expressions/functions";
import { NodeDefs, NodeKindDef } from "../utils";

const getElseEnd = (node: t.IfStatement, source: string) =>
  node.consequent.end! +
  source.slice(node.consequent.end!, node.alternate!.start!).indexOf("else") +
  "else".length;

const isAtSingleIfEnd = (node: t.IfStatement, start: number) =>
  !node.alternate && node.consequent.end! == start;
const isAtElse = (node: t.IfStatement, start: number, source: string) =>
  node.alternate && start == getElseEnd(node, source);

const isTopLevelDeclaration = (path: Path) => path.length == 3;

export const Statement: NodeKindDef<t.Statement> = {
  kind: "Statement",
  isKindOf: ({ node }) => t.isStatement(node),
  hasSlot: ({ node, cursor }) =>
    (t.isIfStatement(node) || t.isFor(node) || t.isDeclaration(node)) &&
    cursor.start == node.start,
  actions: [],
};

export const statements: NodeDefs = {
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
    hasSlot({ node, cursor: { start } }) {
      const kindRange = selectKind(node);
      return kindRange.includes(start) ? kindRange : false;
    },
    actions: (["const", "let", "var"] as const).map((kind) => ({
      id: ["changeDeclarationKind", kind],
      on: {
        at: ({ node, cursor }) => selectKind(node).equals(cursor),
        char: kind[0],
      },
      if: ({ node }) => node.kind != kind,
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
        id: "assign",
        if: ({ node }) => !node.init,
        on: {
          at: ({ node, cursor }) => cursor.start == node.id.end!,
          char: [" ", "="],
        },
        do: ({ node, path }) => ({
          sourceReplace: [new Range(node.end!), "= null"],
          cursor: ({ ast }) => selectNodeFromPath(ast, [...path, "init"]),
        }),
      },
    ],
  },

  BlockStatement: {
    hasSlot: ({ node, cursor: { start } }) =>
      (node.body.length == 0 && node.start! + 1 == start) || node.end == start,
  },

  IfStatement: {
    actions: [
      {
        id: "addElse",
        on: {
          at: ({ node, cursor }) => isAtSingleIfEnd(node, cursor.start),
          char: "e",
        },
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
        on: {
          at: ({ node, cursor }) => isAtSingleIfEnd(node, cursor.start),
          char: "i",
        },
        do: ({ node, path }) => ({
          sourceReplace: [new Range(node.end!), "else if (null) {}"],
          cursor: ({ ast }) =>
            selectNodeFromPath(ast, [...path, "alternate", "test"]),
        }),
      },

      {
        id: "changeElseToElseIf",
        on: {
          at: ({ node, code, cursor }) =>
            isAtElse(node, cursor.start, code.source),
          char: "i",
        },
        do: ({ node, path, code }) => ({
          sourceReplace: [new Range(getElseEnd(node, code.source)), " if (t)"],
          cursor: ({ ast }) =>
            selectNode(getNodeFromPath(ast, [...path, "alternate", "test"])),
        }),
      },
    ],
  },

  ForStatement: {
    hasSlot: ({ node, cursor: { start } }) => {
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
        on: { at: () => false, char: "i" },
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

  FunctionDeclaration: {
    hasSlot: (params) =>
      FunctionExpression.hasSlot!(params as any) ||
      (params.node.start! == params.cursor.start &&
        isTopLevelDeclaration(params.path)),
    actions: [
      ...(FunctionExpression.actions as any),
      {
        id: "export",
        if: ({ path }) => isTopLevelDeclaration(path),
        on: {
          at: ({ node, cursor }) => node.start! == cursor.start,
          char: "e",
        },
        do: ({ node, path }) => ({
          sourceReplace: [new Range(node.start!), "export "],
          cursor: ({ ast }) => {
            const start = (getNodeFromPath(ast, path) as t.ExportDeclaration)
              .start!;
            return new Range(start, start + "export".length);
          },
        }),
      },
    ],
  },

  ReturnStatement: {
    hasSlot: ({ node, cursor }) =>
      !node.argument && node.end! - 1 == cursor.start,
  },

  ExportNamedDeclaration: {
    hasSlot: ({ node, cursor }) => {
      const exportRange = new Range(node.start!, node.start! + "export".length);
      return exportRange.includes(cursor.start) ? exportRange : false;
    },
  },
  ExportDefaultDeclaration: {
    hasSlot: ({ node, cursor }) => {
      if (t.isIdentifier(node.declaration)) {
        return false;
      }
      const defaultStart = node.start! + "export ".length;
      const range = new Range(defaultStart, defaultStart + "default".length);
      return range.includes(cursor.start) ? range : false;
    },
  },
};
