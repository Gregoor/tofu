import * as t from "@babel/types";

import { getLineage, getNode, getNodeFromPath } from "../../ast-utils";
import { selectNode, selectNodeFromPath } from "../../cursor/utils";
import { DetailAction, Range } from "../../utils";
import { NodeDefs, NodeKindDef, wrappers } from "../utils";
import { collections } from "./collections";
import { functions } from "./functions";
import { jsxExpressions } from "./jsx";
import { literals } from "./literals";
import { operations } from "./operations";

export const Expression: NodeKindDef<t.Expression> = {
  kind: "Expression",
  isKindOf({ code, cursor }) {
    const reverseLineage = getLineage(code.ast, cursor.start).reverse();
    const child = reverseLineage[0][0];
    const parent = reverseLineage.length > 1 ? reverseLineage[1][0] : null;
    return (
      t.isExpression(child) &&
      !(
        t.isIdentifier(child) &&
        (t.isDeclaration(parent) || t.isVariableDeclarator(parent))
      ) &&
      !t.isJSXAttribute(parent)
    );
  },
  hasSlot: ({ node, cursor: { start } }) =>
    node.start == start || node.end == start,
  actions: [
    ...wrappers.map(
      ({ type, char, wrap, cursor }) =>
        ({
          id: ["wrap", type],
          on: { at: ({ cursor }) => !cursor.isSingle(), char },
          do: ({ code, node, path }) => {
            const wrapped = code.source.slice(node.start!, node.end!);
            return {
              sourceReplace: [
                selectNode(node),
                wrap(wrapped == "null" ? "" : wrapped),
              ],

              cursor: (code, newCursor) =>
                cursor({
                  node: getNode(code.ast, newCursor.start),
                  path,
                  code,
                  cursor: newCursor,
                }),
            };
          },
        } as DetailAction<t.Expression>),
      {}
    ),

    {
      id: ["wrap", "ternary"],
      on: {
        at: ({ node, cursor }) =>
          node.start! < cursor.start &&
          !(t.isStringLiteral(node) && cursor.start < node.end!),
        char: "?",
      },
      do: ({ node, code: { source }, cursor, path }) =>
        t.isIdentifier(node) && cursor.start < node.end!
          ? {
              sourceReplace: [
                selectNode(node),
                `(${source.slice(node.start!, cursor.start)} ? ${source.slice(
                  cursor.start,
                  node.end!
                )} : null)`,
              ],
              cursor: ({ ast }) =>
                selectNodeFromPath(ast, [...path, "alternate"]),
            }
          : {
              sourceReplace: [
                selectNode(node),
                `(${source.slice(node.start!, node.end!)} ? null : null)`,
              ],
              cursor: ({ ast }) =>
                selectNodeFromPath(ast, [...path, "consequent"]),
            },
    },

    {
      id: "makeMember",
      on: {
        at: ({ node, cursor }) =>
          node.end == cursor.end &&
          (cursor.isSingle() || node.start == cursor.start),
        char: ".",
      },
      do: ({ node, path }) => ({
        sourceReplace: [new Range(node.end!), ".p"],
        cursor: ({ ast }) =>
          selectNodeFromPath(
            ast,
            path[path.length - 1] == "property" ? path : [...path, "property"]
          ),
      }),
    },

    {
      id: "makeCall",
      if: ({ node }) =>
        !t.isNumericLiteral(node) && !t.isObjectExpression(node),
      on: { at: ({ node, cursor }) => node.end == cursor.start, char: "(" },
      do: ({ node }) => ({
        sourceReplace: [new Range(node.end!), "()"],
        cursor: (_, { start }) => new Range(start + 1),
      }),
    },

    {
      id: "makeComputedMember",
      if: ({ node }) => !t.isNumericLiteral(node),
      on: {
        at: ({ node, cursor }) =>
          cursor.isSingle() && cursor.start == node.end!,
        char: "[",
      },

      do: ({ node, path }) => ({
        sourceReplace: [new Range(node.start!), "[0]"],
        cursor: ({ ast }) => selectNodeFromPath(ast, [...path, "property"]),
      }),
    },

    ...([
      { id: "and", char: "&", op: "&&", right: "true" },
      { id: "or", char: "|", op: "||", right: "false" },
      { id: "eq", char: "=", op: "==", right: "null" },
    ] as const).map(
      ({ id, char, op, right }) =>
        ({
          id: ["makeOperation", id],
          on: { at: ({ node, cursor }) => node.end! == cursor.start, char },
          do: ({ node, path }) => ({
            sourceReplace: [new Range(node.end!), " " + op + right],
            cursor: ({ ast }) => selectNodeFromPath(ast, [...path, "right"]),
          }),
        } as DetailAction<t.Expression>)
    ),
  ],
};

export const expressions: NodeDefs = {
  Identifier: {
    hasSlot: () => true,
    onInput: ({ node, path, code, cursor }, text) => ({
      ast() {
        (getNodeFromPath(code.ast, path) as typeof node).name =
          node.name.slice(0, cursor.start - node.start!) +
          text +
          node.name.slice(cursor.end - node.start!);
      },
      cursor: new Range(cursor.start + text.length),
    }),
    // onDelete: () => ({}),
    actions: [
      {
        id: "assign",
        if: ({ node, path, code }) =>
          !["var", "let", "const"].includes(node.name) &&
          t.isExpressionStatement(getNodeFromPath(code.ast, path.slice(0, -1))),
        on: {
          at: ({ node, cursor }) => node.end == cursor.start,
          char: [" ", "="],
        },

        do: ({ node, path }) => ({
          sourceReplace: [new Range(node.end!), "= null"],
          cursor: ({ ast }) => selectNodeFromPath(ast, path.concat("right")),
        }),
      },
    ],
  },

  ...literals,
  ...operations,
  ...functions,
  ...collections,

  ...jsxExpressions,
};
