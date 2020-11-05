import * as t from "@babel/types";

import { getParentsAndPathTD, getNodeFromPath } from "../ast-utils";
import { moveCursor } from "../cursor/move";
import { CodeWithAST } from "../history";
import { buildActionCreators, isMac, withNode } from "./utils";
import { Range } from "../utils";

export const basicActions = buildActionCreators([
  ...([
    ["ArrowLeft", "LEFT"],
    ["ArrowRight", "RIGHT"],
    ["ArrowUp", "UP"],
    ["ArrowDown", "DOWN"],
  ] as const).map(([key, direction]) => ({
    on: { key },
    do: (codeWithAST, cursor) => (_) => ({
      cursor: moveCursor(codeWithAST, cursor, direction),
    }),
  })),

  {
    on: isMac ? { key: "ArrowLeft", metaKey: true } : { key: "Home" },
    do: () => (_) => ({}),
  },
  {
    on: isMac ? { key: "ArrowRight", metaKey: true } : { key: "End" },
    do: () => (_) => ({}),
  },

  {
    on: { key: "Tab", shiftKey: "optional" },
    do: withNode((node, codeWithAST, { start, end }) => (modifiers) => ({
      cursor: modifiers.shiftKey
        ? moveCursor(codeWithAST, new Range(node.start), "LEFT")
        : moveCursor(
            codeWithAST,
            new Range(start == end ? node.end : end),
            "RIGHT"
          ),
    })),
  },

  {
    on: { key: "Enter", shiftKey: "optional" },
    do: ({ code }, { start }) => (modifiers) => {
      const accuCharCounts = code
        .split("\n")
        .map((s, i) => s.length + (i == 0 ? 0 : 1))
        .reduce((accu, n) => accu.concat((accu[accu.length - 1] || 0) + n), []);
      let index = accuCharCounts.findIndex(
        (n) => n >= start - 2 // I don't quite get this one
      );
      if (modifiers.shiftKey && index > 0) {
        index -= 1;
      }
      const pos = index == -1 ? 0 : accuCharCounts[index];
      return {
        codeWithAST: CodeWithAST.fromCode(
          code.slice(0, pos) + "\n" + code.slice(pos)
        ),
        cursor: new Range(pos == 0 ? 0 : pos + 1),
        skipFormatting: true,
      };
    },
  },

  {
    on: { key: "Backspace" },
    do: ({ code, ast }, cursor) => () => {
      const { start, end } = cursor;
      if (ast) {
        const [parents, path] = getParentsAndPathTD(ast, start);
        const node = parents[parents.length - 1];
        if (
          (t.isCallExpression(node) || t.isMemberExpression(node)) &&
          start == node.end
        ) {
          return {
            codeWithAST: CodeWithAST.fromMutatedAST(ast, (ast) => {
              const [parents, path] = getParentsAndPathTD(ast, start);
              const [, parent] = parents.slice().reverse();
              const [lastKey] = path.slice().reverse();
              parent[lastKey] = t.isCallExpression(node)
                ? node.callee
                : node.object;
            }),
            nextCursor: ({ ast }) => new Range(getNodeFromPath(ast, path).end),
          };
        }
      }
      const codeWithAST = CodeWithAST.fromCode(
        code.slice(0, start === end ? start - 1 : start) + code.slice(end)
      );

      return {
        codeWithAST,
        cursor: moveCursor(codeWithAST, cursor, "LEFT"),
      };
    },
  },

  {
    on: { key: "Delete" },
    do: ({ code, ast }, { start, end }) => () => ({
      codeWithAST: CodeWithAST.fromCode(
        code.slice(0, start) + code.slice(start === end ? end + 1 : end)
      ),
    }),
  },

  {
    on: {
      key: "z",
      ...(isMac ? { metaKey: true } : { ctrlKey: true }),
    },
    do: () => () => ({ history: "UNDO" }),
  },
  {
    on: {
      key: "z",
      shiftKey: true,
      ...(isMac ? { metaKey: true } : { ctrlKey: true }),
    },
    do: () => () => ({ history: "REDO" }),
  },
]);
