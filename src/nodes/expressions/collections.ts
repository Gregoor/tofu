import generate from "@babel/generator";
import * as t from "@babel/types";

import { getNode, getNodeFromPath } from "../../ast-utils";
import { selectNodeFromPath } from "../../cursor/utils";
import { DetailAction, Range } from "../../utils";
import { NodeDefs, findSlotIndex } from "../utils";

const generateCode = (node: t.Node) =>
  generate(node as any, { retainLines: true }).code.trim();

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

export const collections: NodeDefs = {
  ArrayExpression: {
    hasSlot({ node, cursor: { start } }) {
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
          // if: ({ node, cursor }) =>
          //   cursor.start > node.start! &&
          //   cursor.end < node.end! &&
          // getIndexAndMoveDirection(node, cursor.start) !== null,
          keybinding:
            "Alt+" + (direction == "LEFT" ? "ArrowLeft" : "ArrowRight"),
          do: ({ node, path }) => {
            const [itemIndex, moveDirection] = getIndexAndMoveDirection(
              node,
              node.start!
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
    onInput: ({ node, path, code, cursor }, text) =>
      node == getNode(code.ast, cursor.start) && {
        sourceReplace: [new Range(cursor.start!), text + ","],
        cursor: (newCode) =>
          new Range(
            (getNodeFromPath(newCode.ast, [
              ...path,
              "elements",
              findSlotIndex(node.elements, cursor.start),
            ]) as t.Node).start! + 1
          ),
      },
  },

  ObjectExpression: {
    hasSlot: ({ node, cursor: { start } }) =>
      (node.properties.length == 0 && start == node.start! + 1) ||
      start == node.end,
    onInput: ({ node, path, code, cursor }, text) =>
      node == getNode(code.ast, cursor.start) && {
        sourceReplace: [new Range(cursor.start!), text + ","],
        cursor: (newCode) =>
          new Range(
            (getNodeFromPath(newCode.ast, [
              ...path,
              "properties",
              findSlotIndex(node.properties, cursor.start),
            ]) as t.Node).start! + 1
          ),
      },
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
        on: {
          at: ({ node, cursor }) => node.end! == cursor.start,
          char: [" ", ":"],
        },
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
    hasSlot: ({ node, cursor }) =>
      node.params.length == 0 && node.key.end! + 1 == cursor.start,
  },

  MemberExpression: {
    hasSlot: ({ node, cursor }) => node.computed && cursor.start == node.end,
  },
};
