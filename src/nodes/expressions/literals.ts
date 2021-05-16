import { selectNode } from "../../cursor/utils";
import { Range } from "../../utils";
import { NodeDefs } from "../utils";

export const literals: NodeDefs = {
  NumericLiteral: {
    hasSlot: () => true,
    actions: [
      {
        id: "decimalize",
        if: ({ node }) => Number.isInteger(node.value),
        on: {
          at: ({ node, cursor }) =>
            cursor.isSingle() && cursor.start == node.end,
          char: ".",
        },

        do: ({ node }) => ({
          sourceReplace: [new Range(node.end!), ".0"],
          cursor: () => new Range(node.end! + 1, node.end! + 2),
        }),
      },
    ],
  },

  StringLiteral: {
    hasSlot: () => true,
  },

  TemplateLiteral: { hasSlot: () => true },
  BooleanLiteral: { hasSlot: ({ node }) => selectNode(node) },
  NullLiteral: { hasSlot: ({ node }) => selectNode(node) },
};
