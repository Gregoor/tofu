import * as t from "@babel/types";

import { getNode, getNodeFromPath } from "../../ast-utils";
import { selectOperator } from "../../cursor/utils";
import { DetailAction } from "../../utils";
import { NodeDefs } from "../utils";

const changeOperationActions: DetailAction<
  t.BinaryExpression | t.LogicalExpression
>[] = (["&", "|", "+", "-", "*", "/", "=", "<", ">"] as const).map(
  (operator) => ({
    id: ["changeOperation", operator],
    on: {
      at: ({ node, code, cursor }) =>
        selectOperator(node, code.source).includes(cursor.start),
      char: operator,
    },

    do: ({ node, path }) => ({
      ast(ast) {
        const newNode = getNodeFromPath(ast, path) as typeof node;
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

export const operations: NodeDefs = {
  UnaryExpression: { hasSlot: () => true },
  BinaryExpression: {
    hasSlot: ({ node, code, cursor }) => {
      const range = selectOperator(node, code.source);
      return range.includes(cursor.start) ? range : false;
    },
    actions: changeOperationActions,
  },

  LogicalExpression: {
    hasSlot({ node, code, cursor }) {
      const range = selectOperator(node, code.source);
      return range.includes(cursor.start) ? range : false;
    },
    actions: changeOperationActions,
  },
};
