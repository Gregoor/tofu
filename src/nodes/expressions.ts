import generate from "@babel/generator";
import * as t from "@babel/types";
import pick from "lodash.pick";

import { getLineage, getNode, getNodeFromPath } from "../ast-utils";
import {
  selectNode,
  selectNodeFromPath,
  selectOperator,
} from "../cursor/utils";
import { Range } from "../utils";
import { jsxExpressions } from "./jsx-expressions";
import {
  NodeActionParams,
  NodeDef,
  NodeDefs,
  NodeDetailActions,
  addElementAction,
  findSlotIndex,
  flattenActions,
} from "./utils";

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
    .filter((n, i) => emptyElementIndexes.includes(i))
    .includes(start);
}

const generateCode = (node: t.Node) =>
  generate(node as any, { retainLines: true }).code.trim();

const changeOperationActions: (
  params: NodeActionParams<t.BinaryExpression | t.LogicalExpression>
) => NodeDetailActions = ({ node, code, cursor }) =>
  selectOperator(node, code.source).includes(cursor.start) &&
  (["&", "|", "+", "-", "*", "/", "=", "<", ">"] as const).map((operator) => ({
    info: { type: "CHANGE_OPERATION", operator } as const,
    on: { key: operator },
    do: () => ({
      code: code.mutateAST((ast) => {
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
      }),
      cursor: ({ ast, source }, { start }) =>
        selectOperator(getNode(ast, start) as typeof node, source),
    }),
  }));

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
}[] = [
  { type: "ARRAY", key: "[", wrap: (source) => `[${source}]` },
  { type: "OBJECT", key: "{", wrap: (source) => `({key: ${source || '""'}})` },
  { type: "FUNCTION_CALL", key: "(", wrap: (source) => `fn(${source})` },
  { type: "ARROW_FUNCTION", key: ">", wrap: (source) => `(() => (${source}))` },
  { type: "JSX_ELEMENT", key: "<", wrap: (source) => `<>{${source}}</>` },
];

export const expression: NodeDef<t.Expression> = {
  hasSlot: (node, start) => start == node.start || start == node.end,
  actions: ({ node, path, code, cursor: { start, end } }) =>
    flattenActions([
      node.start == start &&
        node.end == end && [
          wrappers.map(({ type, key, wrap }) => ({
            info: { type: "WRAP", wrapper: type },
            on: { key },
            do: () => {
              const wrapped = code.source.slice(start, end);
              return {
                code: code.replaceSource(
                  new Range(start, end),
                  wrap(wrapped == "null" ? "" : wrapped)
                ),
                cursor: ({ ast }) => selectNodeFromPath(ast, path),
              };
            },
          })),

          {
            info: { type: "WRAP", wrapper: "TERNARY" },
            on: { key: "?" },
            do: () => ({
              code: code.replaceSource(
                selectNode(node),
                code.source.slice(node.start!, node.end!) + " ? null : null"
              ),
              cursor: ({ ast }) =>
                selectNodeFromPath(ast, [...path, "consequent"]),
            }),
          },
        ],

      node.end == start && [
        {
          info: {
            type: "MAKE_MEMBER",
          },
          on: { key: "." },
          do: () => ({
            code: code.replaceSource(
              new Range(node.start!, node.end),
              `${code.source.slice(node.start!, node.end!)}.p`
            ),
            cursor: ({ ast }) => selectNodeFromPath(ast, [...path, "property"]),
          }),
        },

        !t.isNumericLiteral(node) && [
          !t.isObjectExpression(node) && {
            info: { type: "MAKE_CALL" },
            on: { key: "(" },
            do: () => ({
              code: code.replaceSource(new Range(start), "()"),
              cursor: ({ ast }, { start }) => new Range(start + 1),
            }),
          },
          {
            info: { type: "MAKE_COMPUTED_MEMBER" },
            on: { key: "[" },
            do: () => ({
              code: code.replaceSource(new Range(start), "[0]"),
              cursor: ({ ast }) =>
                selectNodeFromPath(ast, [...path, "property"]),
            }),
          },
        ],
      ],
    ]).map((action) => ({
      ...action,
      do: (code, cursor) => {
        const change = action.do(code, cursor);
        const [[node], [parent]] = getLineage(code.ast, start).reverse();
        if (!(t.isStringLiteral(node) && t.isJSXAttribute(parent))) {
          return change;
        }

        return change;
      },
    })),
};

export const expressions: NodeDefs = {
  NumericLiteral: {
    hasSlot: () => true,
    actions: ({ node, code, cursor }) =>
      Number.isInteger(node.value) &&
      cursor.isSingle() &&
      cursor.start == node.end && {
        info: { type: "DOT" },
        on: { key: "." },
        do: () => ({
          code: code.replaceSource(cursor, ".0"),
          cursor: () => new Range(cursor.start + 1, cursor.start + 2),
        }),
      },
  },
  StringLiteral: {
    hasSlot: (node, start) => true,
  },
  TemplateLiteral: { hasSlot: () => true },
  BooleanLiteral: { hasSlot: selectNode },
  NullLiteral: { hasSlot: selectNode },

  Identifier: { hasSlot: () => true },

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
    actions: ({ node, leafNode, path, code, cursor }) => [
      cursor.start > node.start! &&
        cursor.end < node.end! &&
        (["LEFT", "RIGHT"] as const).map((direction) => {
          const itemIndex = findSlotIndex(node.elements, cursor.start) - 1;

          let moveDirection: null | 1 | -1 = null;
          if (direction == "LEFT" && itemIndex > 0) {
            moveDirection = -1;
          }
          if (direction == "RIGHT" && itemIndex < node.elements.length - 1) {
            moveDirection = 1;
          }
          if (moveDirection === null) {
            return null;
          }

          const newIndex = itemIndex + moveDirection;

          const first = node.elements[Math.min(itemIndex, newIndex)]!;
          const second = node.elements[Math.max(itemIndex, newIndex)]!;
          return {
            info: { type: "MOVE_ELEMENT", direction },
            on: {
              key: direction == "LEFT" ? "ArrowLeft" : "ArrowRight",
              altKey: true,
            },
            do: () => ({
              code: code.replaceSource(
                new Range(first.start!, second.end),
                generateCode(second) + "," + generateCode(first)
              ),
              cursor: ({ ast }) =>
                selectNodeFromPath(ast, [...path, "elements", newIndex]),
            }),
          };
        }),
      addElementAction(
        { node, leafNode, path, code, cursor },
        "elements",
        t.nullLiteral()
      ),
    ],
  },

  ObjectExpression: {
    hasSlot: (node, start) =>
      (node.properties.length == 0 && start == node.start! + 1) ||
      start == node.end,
    actions: (params) =>
      addElementAction(
        params,
        "properties",
        t.objectProperty(t.identifier("p"), t.identifier("p"), false, true)
      ),
  },
  ObjectProperty: {
    actions: ({ node, path, code }) =>
      node.shorthand && {
        on: { key: ":" },
        do: () => ({
          code: code.mutateAST((ast) => {
            (getNodeFromPath(ast, path) as typeof node).value = t.nullLiteral();
          }),
          cursor: (code) => selectNodeFromPath(code.ast, path.concat("value")),
        }),
      },
  },

  MemberExpression: {
    hasSlot: (node, start) => node.computed && start == node.end,
  },

  FunctionExpression: {
    hasSlot: (node, start, code) =>
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
    actions: (params) => addElementAction(params, "params", t.identifier("p")),
  },
  ArrowFunctionExpression: {
    hasSlot: (node, start) =>
      node.params.length == 0 && node.start! + 1 == start,
    actions: ({ node, leafNode, cursor, code, path }) => [
      cursor.start < node.body.start! &&
        addElementAction(
          { node, leafNode, path, code, cursor },
          "params",
          t.identifier("p")
        ),

      {
        info: { type: "CONVERT", to: "FunctionExpression" },
        do: () => ({
          code: code.mutateAST((ast) => {
            (getNodeFromPath(ast, path.slice(0, -1)) as any)[
              path[path.length - 1]
            ] = Object.assign(
              t.functionExpression(null, [], t.blockStatement([])),
              pick(node, "params", "async", "body")
            );
          }),
        }),
      },
    ],
  },

  CallExpression: {
    hasSlot: (node, start) =>
      node.arguments.length == 0 && node.end! - 1 == start,
    actions: ({ node, cursor, ...params }) =>
      cursor.start > node.callee.end! &&
      addElementAction(
        { node, cursor, ...params },
        "arguments",
        t.nullLiteral()
      ),
  },

  ...jsxExpressions,
};
