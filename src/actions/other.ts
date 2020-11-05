import * as t from "@babel/types";

import { getNodeFromPath, getParentsAndPathTD } from "../ast-utils";
import { replaceCode } from "../code-utils";
import { selectKind, selectNode } from "../cursor/utils";
import { CodeWithAST } from "../history";
import { buildActionCreators, withNode } from "./utils";
import { Range } from "../utils";
import { doc } from "prettier";

const getNode = (ast: t.File, start: number) => {
  const [parents] = getParentsAndPathTD(ast, start);
  const [node] = parents.slice().reverse();
  return node;
};

export const otherActions = buildActionCreators([
  ...(["const", "let", "var"] as const).map((kind) => ({
    info: { type: "CHANGE_DECLARATION_KIND", kind } as const,
    on: { key: kind[0] },
    do: withNode((node, { code }) =>
      t.isVariableDeclaration(node) && node.kind != kind
        ? () => ({
            codeWithAST: CodeWithAST.fromCode(
              replaceCode(
                code,
                new Range(node.start, node.start + node.kind.length),
                kind
              )
            ),
            nextCursor: ({ ast }, { start }) =>
              selectKind(getNode(ast, start) as typeof node),
          })
        : undefined
    ),
  })),

  {
    on: [{ key: " " }, { key: "=", shiftKey: "optional" }],
    do: ({ ast, code }, { end }) => {
      if (!ast) {
        return null;
      }
      const [parents, path] = getParentsAndPathTD(ast, end);
      const parent = parents[parents.length - 2];
      if (!t.isVariableDeclarator(parent) || parent.init) {
        return null;
      }
      return () => ({
        codeWithAST: CodeWithAST.fromCode(
          replaceCode(code, new Range(end), "= null")
        ),
        nextCursor: ({ ast }) =>
          selectNode(getNodeFromPath(ast, path.slice(0, -1).concat("init"))),
      });
    },
  },

  ...(["&", "|", "+", "-", "*", "/", "=", "<", ">"] as const).map(
    (operator) => ({
      info: { type: "CHANGE_OPERATION", operator } as const,
      on: { key: operator, shiftKey: "optional" as const },
      do: withNode((node, { ast }, { start }) =>
        t.isLogicalExpression(node) ||
        t.isBinaryExpression(node) ||
        t.isAssignmentExpression(node)
          ? () => ({
              codeWithAST: CodeWithAST.fromMutatedAST(ast, (ast) => {
                const newNode = getNode(ast, start) as typeof node;
                const isDoubleable = ["&", "|", "="].includes(operator);
                if (operator === "=") {
                  newNode.operator =
                    node.operator == ">" || node.operator == "<"
                      ? node.operator + "="
                      : operator.repeat(node.operator == "==" ? 3 : 2);
                } else {
                  newNode.operator =
                    isDoubleable &&
                    (newNode.operator.length == 1 ||
                      newNode.operator[0] !== operator)
                      ? ((operator + operator) as any)
                      : operator;
                }
              }),
              nextCursor: ({ ast }, { start }) => {
                const newNode = getNode(ast, start) as typeof node;
                return new Range(newNode.left.end + 1, newNode.right.start - 1);
              },
            })
          : null
      ),
    })
  ),
]);
