import generate from "@babel/generator";
import * as t from "@babel/types";
import pick from "lodash.pick";
import { pathToFileURL } from "node:url";

import { getNode, getNodeFromPath } from "../ast-utils";
import {
  selectNode,
  selectNodeFromPath,
  selectOperator,
} from "../cursor/utils";
import { CursorFn, DetailAction, Range } from "../utils";
import { NodeDefs, findSlotIndex } from "./utils";

function checkForEmptyElements(
  node: t.ArrayExpression,
  start: number
): boolean {
  const emptyElementIndexes: number[] = [];
  const elementEnds: number[] = [];
  for (let i = 0; i < node.elements.length; i++) {
    const element = node.elements[i];
    if (element) {
      elementEnds.push(element.end!);
      continue;
    }

    emptyElementIndexes.push(i);
    elementEnds.push(i == 0 ? node.start! + 1 : elementEnds[i - 1] + 2);
  }

  return elementEnds
    .filter((_n, i) => emptyElementIndexes.includes(i))
    .includes(start);
}

const generateCode = (node: t.Node) =>
  generate(node as any, { retainLines: true }).code.trim();

const changeOperationActions: DetailAction<
  t.BinaryExpression | t.LogicalExpression
>[] = (["&", "|", "+", "-", "*", "/", "=", "<", ">"] as const).map(
  (operator) => ({
    id: ["changeOperation", operator],
    if: ({ node, code, cursor }) =>
      selectOperator(node, code.source).includes(cursor.start),
    on: operator,
    do: ({ node, cursor }) => ({
      ast(ast) {
        const newNode = getNode(ast, cursor.start) as typeof node;
        const isDoubleable = ["&", "|", "="].includes(operator);
        if (operator === "=") {
          newNode.operator = (node.operator == ">" || node.operator == "<"
            ? node.operator + "="
            : operator.repeat(
                node.operator == "==" ? 3 : 2
              )) as typeof node.operator;
        } else {
          newNode.operator =
            isDoubleable &&
            (newNode.operator.length == 1 || newNode.operator[0] !== operator)
              ? ((operator + operator) as any)
              : operator;
        }
      },
      cursor: ({ ast, source }, { start }) =>
        selectOperator(getNode(ast, start) as typeof node, source),
    }),
  })
);

function asyncRange(node: t.FunctionExpression, start: number) {
  if (!node.async) {
    return null;
  }
  const range = new Range(node.start!, node.start! + "async".length);
  return range.includes(start) ? range : null;
}

// const removeCallOrMember: (
//   params: NodeActionParams<t.CallExpression | t.MemberExpression>
// ) => NodeDetailActions = ({ node, path, code, cursor: { start } }) =>
//   start == node.end!
//     ? {
//         on: { code: "Backspace" },
//         do: () => ({
//           code: code.mutateAST((ast) => {
//             const parent = getNodeFromPath(ast, path.slice(0, -1)) as any;
//             parent[path[path.length - 1]] = t.isCallExpression(node)
//               ? node.callee
//               : node.object;
//           }),
//           cursor: ({ ast }) =>
//             new Range((getNodeFromPath(ast, path) as t.Node).end!),
//         }),
//       }
//     : null;
const wrappers: {
  type: string;
  key: string;
  wrap: (source: string) => string;
  cursor?: CursorFn;
}[] = [
  { type: "array", key: "[", wrap: (source) => `[${source}]` },
  {
    type: "object",
    key: "Shift+[",
    wrap: (source) => `({key: ${source || '""'}})`,
  },

  { type: "call", key: "Shift+9", wrap: (source) => `fn()` },
  { type: "arrow", key: "Shift+.", wrap: (source) => `(() => ())` },
  { type: "jsx", key: "Shift+,", wrap: (source) => `<>{}</>` },
];

export const expressions: NodeDefs = {
  Expression: {
    hasSlot: (node, start) => node.start == start || node.end == start,
    actions: [
      ...wrappers.map(
        ({ type, key, wrap }) =>
          ({
            id: ["wrap", type],
            if: ({ cursor }) => !cursor.isSingle(),
            on: key,
            do: ({ code, cursor: { start, end }, path }) => {
              const wrapped = code.source.slice(start, end);
              return {
                sourceReplace: [
                  new Range(start, end),
                  wrap(wrapped == "null" ? "" : wrapped),
                ],

                cursor: ({ ast }) => selectNodeFromPath(ast, path),
              };
            },
          } as DetailAction<t.Expression>),
        {}
      ),

      {
        id: ["wrap", "ternary"],
        on: "Shift+/",
        do: ({ node, code: { source }, cursor, path }) =>
          cursor.start < node.end!
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
        on: ".",
        if: ({ node, cursor }) =>
          node.start == cursor.start && node.end == cursor.end,
        do: ({ node, code, path }) => ({
          sourceReplace: [
            new Range(node.start!, node.end),
            `(${code.source.slice(node.start!, node.end!)}).p`,
          ],

          cursor: ({ ast }) => selectNodeFromPath(ast, [...path, "property"]),
        }),
      },

      {
        id: "makeCall",
        if: ({ node }) =>
          !t.isNumericLiteral(node) && !t.isObjectExpression(node),
        on: "(",
        do: ({ cursor }) => ({
          sourceReplace: [new Range(cursor.start), "()"],
          cursor: (_, { start }) => new Range(start + 1),
        }),
      },

      {
        id: "makeComputedMember",
        if: ({ node, cursor }) =>
          cursor.isSingle() &&
          !t.isNumericLiteral(node) &&
          cursor.start == node.end!,
        on: "[",
        do: ({ path, cursor }) => ({
          sourceReplace: [new Range(cursor.start), "[0]"],
          cursor: ({ ast }) => selectNodeFromPath(ast, [...path, "property"]),
        }),
      },

      ...([
        { id: "and", on: "Shift+7", op: "&&", right: "true" },
        { id: "or", on: "Shift+\\", op: "||", right: "false" },
        { id: "eq", on: "=", op: "==", right: "null" },
      ] as const).map(
        ({ id, on, op, right }) =>
          ({
            id: ["makeOperation", id],
            if: ({ node, cursor }) => node.end! == cursor.start,
            on,
            do: ({ node, path }) => ({
              sourceReplace: [new Range(node.end!), op + right],
              cursor: ({ ast }) => selectNodeFromPath(ast, [...path, "right"]),
            }),
          } as DetailAction<t.Expression>)
      ),
    ],
  },

  NumericLiteral: {
    hasSlot: () => true,
    actions: [
      {
        id: "decimalize",
        if: ({ node, cursor }) =>
          Number.isInteger(node.value) &&
          cursor.isSingle() &&
          cursor.start == node.end,
        on: ".",
        do: ({ cursor }) => ({
          sourceReplace: [cursor, ".0"],
          cursor: () => new Range(cursor.start + 1, cursor.start + 2),
        }),
      },
    ],
  },

  StringLiteral: {
    hasSlot: () => true,
  },

  TemplateLiteral: { hasSlot: () => true },
  BooleanLiteral: { hasSlot: selectNode },
  NullLiteral: { hasSlot: selectNode },

  Identifier: {
    hasSlot: () => true,
    actions: [
      {
        id: "assign",
        if: ({ node, path, code, cursor }) =>
          node.end == cursor.start &&
          t.isExpressionStatement(getNodeFromPath(code.ast, path.slice(0, -1))),
        on: ["space", "="],
        do: ({ cursor, path }) => ({
          sourceReplace: [cursor, "= null"],
          cursor: ({ ast }) => selectNodeFromPath(ast, path.concat("right")),
        }),
      },
    ],
  },

  UnaryExpression: { hasSlot: () => true },
  BinaryExpression: {
    hasSlot: (node, start, { source }) => {
      const range = selectOperator(node, source);
      return range.includes(start) ? range : false;
    },
    actions: changeOperationActions,
  },

  LogicalExpression: {
    hasSlot(node, start, { source }) {
      const range = selectOperator(node, source);
      return range.includes(start) ? range : false;
    },
    actions: changeOperationActions,
  },

  ArrayExpression: {
    hasSlot(node, start) {
      if (
        (node.elements.length == 0 && start == node.start! + 1) ||
        start == node.end
      ) {
        return true;
      }
      return checkForEmptyElements(node, start);
    },
    actions: [
      ...(["LEFT", "RIGHT"] as const).map((direction) => {
        function getIndexAndMoveDirection(
          node: t.ArrayExpression,
          start: number
        ) {
          const itemIndex = findSlotIndex(node.elements, start) - 1;

          if (direction == "LEFT" && itemIndex > 0) {
            return [itemIndex, -1];
          } else if (
            direction == "RIGHT" &&
            itemIndex < node.elements.length - 1
          ) {
            return [itemIndex, 1];
          } else {
            return null;
          }
        }

        return {
          id: ["moveElement", direction],
          if: ({ node, cursor }) =>
            cursor.start > node.start! &&
            cursor.end < node.end! &&
            getIndexAndMoveDirection(node, cursor.start) !== null,
          on: "Alt+" + (direction == "LEFT" ? "ArrowLeft" : "ArrowRight"),
          do: ({ node, path, cursor }) => {
            const [itemIndex, moveDirection] = getIndexAndMoveDirection(
              node,
              cursor.start
            )!;

            const newIndex = itemIndex + moveDirection;

            const first = node.elements[Math.min(itemIndex, newIndex)]!;
            const second = node.elements[Math.max(itemIndex, newIndex)]!;
            return {
              sourceReplace: [
                new Range(first.start!, second.end),
                generateCode(second) + "," + generateCode(first),
              ],

              cursor: ({ ast }) =>
                selectNodeFromPath(ast, [...path, "elements", newIndex]),
            };
          },
        } as DetailAction<t.ArrayExpression>;
      }),
      // addElementAction(
      //   { node, leafNode, path, code, cursor },
      //   "elements",
      //   t.nullLiteral()
      // ),
    ],
  },

  ObjectExpression: {
    hasSlot: (node, start) =>
      (node.properties.length == 0 && start == node.start! + 1) ||
      start == node.end,
    // actions: (params) =>
    //   addElementAction(
    //     params,
    //     "properties",
    //     t.objectProperty(t.identifier("p"), t.identifier("p"), false, true)
    //   ),
  },
  ObjectProperty: {
    actions: [
      {
        id: "addObjectPropertyValue",
        if: ({ node }) => node.shorthand,
        on: ["space", ":"],
        do: ({ node, path }) => ({
          ast(ast) {
            (getNodeFromPath(ast, path) as typeof node).value = t.nullLiteral();
          },
          cursor: (code) => selectNodeFromPath(code.ast, path.concat("value")),
        }),
      },
    ],
  },

  ObjectMethod: {
    hasSlot: (node, start) =>
      node.params.length == 0 && node.key.end! + 1 == start,
  },

  MemberExpression: {
    hasSlot: (node, start) => node.computed && start == node.end,
  },

  FunctionExpression: {
    hasSlot: (node, start, code) =>
      asyncRange(node, start) ||
      start ==
        node.start! +
          code.source
            .slice(node.start!, node.body.start!)
            .indexOf("function ") +
          "function ".length ||
      (node.params.length == 0 &&
        start ==
          node.start! +
            code.source.slice(node.start!, node.body.start!).indexOf("()") +
            1),
    actions: [
      {
        id: "makeAsync",
        if: ({ node, cursor }) => !node.async && node.start == cursor.start,
        on: "a",
        do: ({ node, cursor }) => ({
          ast(ast) {
            (getNode(ast, cursor.start) as typeof node).async = true;
          },
          cursor: (code, { start }) =>
            asyncRange(getNode(code.ast, start) as typeof node, start)!,
        }),
      },
    ],

    // actions: (params) => addElementAction(params, "params", t.identifier("p")),
  },
  ArrowFunctionExpression: {
    hasSlot: (node, start) =>
      node.params.length == 0 && node.start! + 1 == start,
    actions: [
      // cursor.start < node.body.start! &&
      //   addElementAction(
      //     { node, leafNode, path, code, cursor },
      //     "params",
      //     t.identifier("p")
      //   ),

      {
        id: ["convert", "FunctionExpression"],
        on: "???",
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
    hasSlot: (node, start) =>
      node.arguments.length == 0 && node.end! - 1 == start,
    //   actions: ({ node, cursor, ...params }) =>
    //     cursor.start > node.callee.end! &&
    //     addElementAction(
    //       { node, cursor, ...params },
    //       "arguments",
    //       t.nullLiteral()
    //     ),
  },

  NewExpression: { hasSlot: (node, start) => node.end! - 1 == start },
};
