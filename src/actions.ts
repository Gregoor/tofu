import * as t from "@babel/types";

import { getLineage } from "./ast-utils";
import { moveCursor } from "./cursor/move";
import { selectNode, selectNodeFromPath } from "./cursor/utils";
import { DetailAction, Range } from "./utils";

function isAtLineStart(source: string, start: number) {
  const reverseBreakIndex = source
    .slice(0, start + 1)
    .split("")
    .reverse()
    .findIndex((char) => char == "\n");
  const sourceFromStartOfLine = source.slice(
    reverseBreakIndex == -1 ? 0 : start - (reverseBreakIndex || start),
    start
  );
  return !sourceFromStartOfLine.trim();
}

export const baseDetailActions: DetailAction<t.Node>[] = [
  ...(["LEFT", "RIGHT", "UP", "DOWN"] as const).map(
    (direction) =>
      ({
        id: ["moveCursor", direction],
        keybinding: direction.toLowerCase(),
        do: ({ code, cursor }) => ({
          cursor: moveCursor(code, cursor, direction),
        }),
      } as DetailAction<t.Node>)
  ),

  {
    id: "addLine",
    keybinding: "Enter",
    do({ code, cursor: { start } }) {
      let pos = 0;
      const wasAtLineStart = isAtLineStart(code.source, start);
      if (wasAtLineStart) {
        pos = start;
      } else {
        const accuCharCounts = (code.source.split("\n") as string[])
          .map((s, i) => s.length + (i == 0 ? 0 : 1))
          .reduce(
            (accu, n) => [...accu, (accu[accu.length - 1] || 0) + n],
            [] as number[]
          );
        const index = accuCharCounts.findIndex((n) => n >= start);
        pos = index == -1 ? 0 : accuCharCounts[index];
      }
      return {
        sourceReplace: [new Range(pos), "\n"],
        cursor: new Range(pos == 0 ? 0 : wasAtLineStart ? pos - 1 : pos + 1),

        skipFormatting: true,
      };
    },
  },

  ...([
    ["UP", "up"],
    ["DOWN", "down"],
    ["LEFT", "left"],
    ["RIGHT", "right"],
  ] as const).map(
    ([direction, keyCode]) =>
      ({
        id: ["selectRange", direction],
        if: ({ leafNode }) => !t.isTemplateElement(leafNode),
        keybinding: "Shift+" + keyCode,
        do: () => ({ rangeSelect: direction }),
      } as DetailAction<t.Node>)
  ),

  {
    id: "stretch",
    keybinding: "Alt+up",
    do: ({ code, cursor }) => {
      const nodes = getLineage(code.ast, cursor.start).reverse();
      const selectedNodeIndex = nodes.findIndex(
        ([node]) => node.start! <= cursor.start && node.end! >= cursor.end
      );

      const [selectedNode] = nodes[selectedNodeIndex];
      const typeCheck = [t.isExpression, t.isStatement].find((test) =>
        test(selectedNode)
      )!;

      const result = nodes
        .slice(selectedNodeIndex + 1)
        .find(
          ([node]) =>
            typeCheck(node) &&
            node.start! <= selectedNode.start! &&
            node.end! >= selectedNode.end!
        )!;

      const [parentNode, parentPath] = result;

      return {
        sourceReplace: [
          selectNode(parentNode),
          code.source.slice(selectedNode.start!, selectedNode.end!),
        ],
        cursor: (code) => selectNodeFromPath(code.ast, parentPath),
      };
    },
  },
];

// export function handleInput(code: Code, cursor: Range, data: string): Change {
//   const change = handleNodeInput(code, cursor, data);
//   if (change) {
//     return change;
//   }
//   const { source } = code;
//   const { start, end } = cursor;
//   const newSource = source.slice(0, start) + data + source.slice(end);
//   const newStart = start + data.length;
//   return {
//     source: newSource,
//     cursor: () => new Range(newStart),
//   };
// }
