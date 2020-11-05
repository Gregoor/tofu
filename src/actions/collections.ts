import generate from "@babel/generator";
import * as t from "@babel/types";

import {
  getParentsAndPathBU,
  getParentsAndPathTD,
  getNodeFromPath,
} from "../ast-utils";
import { replaceCode } from "../code-utils";
import { selectNode } from "../cursor/utils";
import { CodeWithAST } from "../history";
import {
  buildActionCreators,
  Change,
  findLastIndex,
  findSlotIndex,
  withAST,
} from "./utils";
import { Range } from "../utils";

const isInCollectionExpression = ({ start, end }: Range) => (node: t.Node) =>
  ((t.isArrayExpression(node) || t.isObjectExpression(node)) &&
    start > node.start &&
    end < node.end) ||
  (t.isCallExpression(node) &&
    start >
      node.end -
        // ()
        2 -
        node.arguments.reduce((sum, node) => sum + node.end - node.start, 0) -
        // ", " between arguments
        (node.arguments.length - 1) * 2 &&
    end < node.end) ||
  t.isArrowFunctionExpression(node);

export const collectionActions = buildActionCreators([
  ...[
    t.isArrayExpression,
    t.isArrowFunctionExpression,
    t.isCallExpression,
    t.isObjectExpression,
  ].map((check) => ({
    info: { type: "ADD_ELEMENT" } as const,
    on: [{ key: "," }, { key: " " }],
    // modifiers:
    //     parentCollectionExpression !== node &&
    //     start !== node.start &&
    //     start !== node.end
    //         ? ["altKey"]
    //         : []
    do: withAST(function addElement({ ast }, cursor) {
      const { start, end } = cursor;
      const [parentsTD, pathTD] = getParentsAndPathTD(ast, start);
      const parentsBU = parentsTD.slice().reverse();

      const parentCollectionExpression = parentsBU.find(
        isInCollectionExpression(cursor)
      );
      if (!check(parentCollectionExpression)) {
        return;
      }

      const collectionIndex = findLastIndex(
        parentsTD,
        isInCollectionExpression(cursor)
      );
      const collection = parentsTD[collectionIndex] as t.Node;
      const [childKey, init] = {
        ArrayExpression: ["elements", t.nullLiteral()],
        ArrowFunctionExpression: ["params", t.identifier("p")],
        CallExpression: ["arguments", t.nullLiteral()],
        ObjectExpression: [
          "properties",
          t.objectProperty(t.identifier("p"), t.identifier("p"), false, true),
        ],
      }[collection.type];

      const node = parentsTD[parentsTD.length - 1] as t.Node;

      let index = findSlotIndex(collection[childKey], start);
      if (start == node.start && end == node.start) {
        index = Math.max(0, index - 1);
      }

      return () => ({
        codeWithAST: CodeWithAST.fromMutatedAST(ast, (ast) => {
          const [parents] = getParentsAndPathTD(ast, start);
          const collection = parents[collectionIndex];
          collection[childKey].splice(index, 0, init);
        }),
        nextCursor: ({ ast }) =>
          selectNode(
            getNodeFromPath(
              ast,
              pathTD.slice(0, collectionIndex).concat(childKey, index)
            )
          ),
      });
    }),
  })),

  ...(["LEFT", "RIGHT"] as const).map((direction) => ({
    info: { type: "MOVE_ELEMENT", direction },
    on: { key: direction == "LEFT" ? "ArrowLeft" : "ArrowRight", altKey: true },
    // "Move " + (t.isArrayExpression(collectionNode) ? "element" : "statement")
    do: withAST(function move({ ast, code }, { start }) {
      const [parentsBU, pathBU] = getParentsAndPathBU(ast, start);
      const collectionIndex = parentsBU.findIndex(
        (n) => t.isProgram(n) || t.isBlockStatement(n) || t.isArrayExpression(n)
      );
      const collectionNode = parentsBU[collectionIndex];
      if (!collectionNode) {
        return null;
      }
      const collection = collectionNode[pathBU[collectionIndex - 1]];
      const itemIndex = Number(pathBU[collectionIndex - 2]);

      let moveDirection: null | 1 | -1 = null;
      if (direction == "LEFT" && itemIndex > 0) {
        moveDirection = -1;
      }
      if (
        direction == "RIGHT" &&
        collection &&
        itemIndex < collection.length - 1
      ) {
        moveDirection = 1;
      }
      if (moveDirection === null) {
        return null;
      }

      return (): Change => {
        const newIndex = itemIndex + moveDirection;

        const first = collection[Math.min(itemIndex, newIndex)];
        const second = collection[Math.max(itemIndex, newIndex)];

        return {
          codeWithAST: CodeWithAST.fromCode(
            replaceCode(
              code,
              new Range(first.start, second.end),
              generate(second, { retainLines: true }).code.trim() +
                (t.isArrayExpression(collectionNode) ? "," : "") +
                generate(first, { retainLines: true }).code.trim()
            )
          ),
          nextCursor({ ast }) {
            const newPath = pathBU.slice();
            newPath[collectionIndex - 2] = newIndex.toString();
            const innerStart = start - parentsBU[0].start;
            return new Range(
              getNodeFromPath(ast, [...newPath.reverse()]).start + innerStart
            );
          },
        };
      };
    }),
  })),
]);
