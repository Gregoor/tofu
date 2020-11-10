import generate from "@babel/generator";
import t from "@babel/types";

import {
  getNode,
  getNodeFromPath,
  getParentsAndPathBU,
  getParentsAndPathTD,
} from "../ast-utils";
import { selectNode, selectOperator } from "../cursor/utils";
import { Range } from "../utils";
import { NodeActionParams, NodeActions, NodeDef, NodeDefs } from "./utils";

function findSlotIndex(collection: any[], start: number) {
  let index = collection.findIndex((n) => n && n.start > start);
  if (index == -1) {
    index = collection.length;
  }
  return index;
}

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
  generate(node, { retainLines: true }).code.trim();

const changeOperationActions: (
  params: NodeActionParams<t.BinaryExpression | t.LogicalExpression>
) => NodeActions = ({ node, code, cursor }) =>
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
      nextCursor: ({ ast, source }, { start }) =>
        selectOperator(getNode(ast, start) as typeof node, source),
    }),
  }));

const removeCallOrMember: (
  params: NodeActionParams<t.CallExpression | t.MemberExpression>
) => NodeActions = ({ node, path, code, cursor: { start } }) =>
  start == node.end!
    ? {
        on: { code: "Backspace" },
        do: () => ({
          code: code.mutateAST((ast) => {
            const [parents, path] = getParentsAndPathTD(ast, start);
            const [, parent] = parents.slice().reverse();
            const [lastKey] = path.slice().reverse();
            (parent as any)[lastKey] = t.isCallExpression(node)
              ? node.callee
              : node.object;
          }),
          nextCursor: ({ ast }) => new Range(getNodeFromPath(ast, path).end!),
        }),
      }
    : null;

const wrappers: {
  type: string;
  key: string;
  wrap: (source: string) => string;
}[] = [
  { type: "ARRAY", key: "[", wrap: (source) => `[${source}]` },
  { type: "OBJECT", key: "{", wrap: (source) => `({key: ${source}})` },
  { type: "FUNCTION_CALL", key: "(", wrap: (source) => `fn(${source})` },
  { type: "ARROW_FUNCTION", key: ">", wrap: (source) => `(() => (${source}))` },
];

export const expression: NodeDef<t.Expression> = {
  hasSlot: (node, start) => node.end == start,
  actions: ({ node, code, cursor: { start, end } }) =>
    node.start != start || node.end != end
      ? []
      : [
          wrappers.map(({ type, key, wrap }) => ({
            info: { type: "WRAP", wrapper: type },
            on: { key },
            do: () => ({
              code: code.replaceSource(
                new Range(start, end),
                wrap(code.source.slice(start, end))
              ),
              nextCursor: ({ ast }, { start }) =>
                selectNode(
                  getNodeFromPath(ast, getParentsAndPathTD(ast, start)[1])
                ),
            }),
          })),

          {
            info: { type: "WRAP", wrapper: "TERNARY" },
            on: { key: "?" },
            do: () => ({
              code: code.replaceSource(
                selectNode(node),
                code.source.slice(node.start!, node.end!) + " ? null : null"
              ),
              nextCursor: ({ ast }, { start }) => {
                const [[, parent]] = getParentsAndPathBU(ast, start);
                return selectNode(
                  (parent as t.ConditionalExpression).consequent
                );
              },
            }),
          },
        ],
};

export const expressions: NodeDefs = {
  NumericLiteral: { hasSlot: () => true },
  StringLiteral: {
    hasSlot: (node, start) => start > node.start!,
  },
  TemplateLiteral: { hasSlot: () => true },
  TemplateElement: { hasSlot: () => true },

  Identifier: { hasSlot: () => true },

  UnaryExpression: { hasSlot: () => true },
  BinaryExpression: {
    hasSlot: (node, start, { source }) => {
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
    actions: ({ node, path, code, cursor: { start, end } }) => [
      (["LEFT", "RIGHT"] as const).map((direction) => {
        const itemIndex = Number(path[path.length - 1]);

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
          // t.isProgram(n) || t.isBlockStatement(n)
          key: direction == "LEFT" ? "ArrowLeft" : "ArrowRight",
          do: () => ({
            code: code.replaceSource(
              new Range(first.start!, second.end),
              generateCode(second) + "," + generateCode(first)
            ),
            // nextCursor({ ast }) {
            //   const newPath = pathBU.slice();
            //   newPath[collectionIndex - 2] = newIndex.toString();
            //   const innerStart = start - parentsBU[0].start;
            //   return new Range(
            //     getNodeFromPath(ast, [...newPath.reverse()]).start +
            //       innerStart
            //   );
            // },
          }),
        };
      }),
      // {
      //   info: { type: "ADD_ELEMENT" },
      //   // ArrowFunctionExpression: ["params", t.identifier("p")],
      //   // CallExpression: ["arguments", t.nullLiteral()],
      //   // ObjectExpression: [
      //   //   "properties",
      //   //   t.objectProperty(
      //   //       t.identifier("p"),
      //   //       t.identifier("p"),
      //   //       false,
      //   //       true
      //   //   ),
      //   // ],
      //   key: ",",
      //   do: () => {
      //     let index = findSlotIndex(node.elements, start);
      //     if (start == node.start && end == node.start) {
      //       index = Math.max(0, index - 1);
      //     }
      //
      //     return () => ({
      //       codeWithAST: CodeWithAST.fromMutatedAST(ast, (ast) => {
      //         const [parents] = getParentsAndPathTD(ast, start);
      //         const collection = parents[collectionIndex];
      //         collection[childKey].splice(index, 0, "null,");
      //       }),
      //       nextCursor: ({ ast }) =>
      //         selectNode(
      //           getNodeFromPath(
      //             ast,
      //             pathTD.slice(0, collectionIndex).concat(childKey, index)
      //           )
      //         ),
      //     });
      //   },
      // },
    ],
  },

  ObjectExpression: {
    hasSlot: (node, start) =>
      (node.properties.length == 0 && start == node.start! + 1) ||
      start == node.end,
  },

  MemberExpression: {
    hasSlot: (node, start) => node.computed && start == node.end,
  },

  ArrowFunctionExpression: {
    hasSlot: (node, start) =>
      node.params.length == 0 && node.start! + 1 == start,
  },

  CallExpression: {
    hasSlot: (node, start) =>
      node.arguments.length == 0 && node.end! - 1 == start,
  },
};
