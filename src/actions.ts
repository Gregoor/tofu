import generate from "@babel/generator";
import * as t from "@babel/types";

import { getNode, getNodeFromPath, getParentsAndPathTD } from "./ast-utils";
import { replaceCode } from "./code-utils";
import { moveCursor } from "./cursor/move";
import { selectName, selectNode } from "./cursor/utils";
import { CodeWithAST } from "./history";
import { findNodeActions } from "./nodes";
import { NodeAction } from "./nodes/utils";
import { Change, KeyConfig, Range, modifierKeys } from "./utils";

type BaseAction = {
  info?: any;
  on?: KeyConfig;
  do: (
    codeWithAST: CodeWithAST,
    cursor: Range,
    isShifted?: boolean
  ) => null | Change;
};

export const isMac = navigator.platform.startsWith("Mac");

const keywords: {
  name: string;
  label?: string;
  create: (child?: string) => string;
  getInitialCursor: (ast: t.File, path: (string | number)[]) => Range;
  canWrapStatement: boolean;
  hidden?: boolean;
}[] = [
  {
    name: "if",
    create: (child = "") => `if (someCondition) { ${child} }`,
    getInitialCursor: (ast, path) =>
      selectName(getNodeFromPath(ast, [...path, "test"]) as t.Identifier),
    canWrapStatement: true,
  },
  {
    name: "for",
    label: "for...of",
    create: (child = "") => `for (const item of iterable) { ${child} }`,
    getInitialCursor: (ast, path) =>
      selectName(
        getNodeFromPath(ast, [
          ...path,
          "left",
          "declarations",
          "0",
          "id",
        ]) as t.Identifier
      ),
    canWrapStatement: true,
  },
  {
    name: "return",
    create: () => "return null;",
    getInitialCursor: (ast, path) =>
      selectNode(getNodeFromPath(ast, path.concat("argument"))),
    hidden: true,
    canWrapStatement: false,
  },

  ...(["const", "let", "var"] as const).map((kind) => ({
    name: kind,
    create: (initial) =>
      generate(
        t.variableDeclaration(kind, [
          t.variableDeclarator(
            t.identifier("n"),
            initial || (kind == "const" ? t.nullLiteral() : null)
          ),
        ])
      ).code,
    getInitialCursor: (ast, path) =>
      selectName(
        getNodeFromPath(ast, [
          ...path,
          "declarations",
          "0",
          "id",
        ]) as t.Identifier
      ),
    canWrapStatement: false,
  })),
];

const baseActionCreators: (
  | BaseAction
  | ((codeWithAST: CodeWithAST, cursor: Range) => BaseAction | null)
)[] = [
  ...([
    ["ArrowLeft", "LEFT"],
    ["ArrowRight", "RIGHT"],
    ["ArrowUp", "UP"],
    ["ArrowDown", "DOWN"],
  ] as const).map(([key, direction]) => ({
    on: { key, shiftKey: false },
    do: (codeWithAST, cursor) => ({
      cursor: moveCursor(codeWithAST, cursor, direction),
    }),
  })),

  {
    on: isMac ? { code: "ArrowLeft", metaKey: true } : { code: "Home" },
    do: () => ({}),
  },
  {
    on: isMac ? { code: "ArrowRight", metaKey: true } : { code: "End" },
    do: () => ({}),
  },

  (codeWithAST, { start, end }) => {
    const node = codeWithAST.ast && getNode(codeWithAST.ast, start);
    if (!node) {
      return null;
    }
    return {
      on: { code: "Tab" },
      do: (_1, _2, isShifted) => ({
        cursor: isShifted
          ? moveCursor(codeWithAST, new Range(node.start), "LEFT")
          : moveCursor(
              codeWithAST,
              new Range(start == end ? node.end : end),
              "RIGHT"
            ),
      }),
    };
  },

  {
    on: { code: "Enter" },
    do: (codeWithAST, { start }, isShifted) => {
      const accuCharCounts = codeWithAST.code
        .split("\n")
        .map((s, i) => s.length + (i == 0 ? 0 : 1))
        .reduce((accu, n) => accu.concat((accu[accu.length - 1] || 0) + n), []);
      let index = accuCharCounts.findIndex(
        (n) => n >= start - 2 // I don't quite get this one
      );
      if (isShifted && index > 0) {
        index -= 1;
      }
      const pos = index == -1 ? 0 : accuCharCounts[index];
      return {
        codeWithAST: codeWithAST.replaceCode(new Range(pos), "\n"),
        cursor: new Range(pos == 0 ? 0 : pos + 1),
        skipFormatting: true,
      };
    },
  },

  {
    on: { code: "Backspace" },
    do: ({ code, ast }, cursor) => {
      const { start, end } = cursor;
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
    on: { code: "Delete" },
    do: ({ code, ast }, { start, end }) => ({
      codeWithAST: CodeWithAST.fromCode(
        code.slice(0, start) + code.slice(start === end ? end + 1 : end)
      ),
    }),
  },

  {
    on: {
      code: "KeyZ",
      ...(isMac ? { metaKey: true } : { ctrlKey: true }),
    },
    do: () => ({ history: "UNDO" }),
  },
  {
    on: {
      code: "KeyZ",
      shiftKey: true,
      ...(isMac ? { metaKey: true } : { ctrlKey: true }),
    },
    do: () => ({ history: "REDO" }),
  },

  {
    on: {
      code: "KeyA",
      ...(isMac ? { metaKey: true } : { ctrlKey: true }),
    },
    do: ({ code }) => ({ cursor: new Range(0, code.length) }),
  },

  ...([
    ["LEFT", "ArrowLeft"],
    ["RIGHT", "ArrowRight"],
    ["UP", "ArrowUp"],
    ["DOWN", "ArrowDown"],
  ] as const).map(([direction, code]) => (codeWithAST) =>
    codeWithAST.ast
      ? {
          info: { type: "RANGE_SELECT", direction } as const,
          on: { code, shiftKey: true },
          do: (codeWithAST) => ({ rangeSelect: direction }),
        }
      : null
  ),

  ...keywords.map(
    ({ name, create, getInitialCursor }) => ({ code }, { start }) => {
      if (
        code.slice(start - name.length, start) != name ||
        code[start + 1] != "\n"
      ) {
        return null;
      }
      return {
        on: { code: "Space" },
        do: () => ({
          codeWithAST: CodeWithAST.fromCode(
            replaceCode(code, new Range(start - name.length, start), create())
          ),
          nextCursor: ({ ast }) =>
            getInitialCursor(ast, getParentsAndPathTD(ast, start)[1]),
        }),
      };
    }
  ),
];

export const getBaseActions = (codeWithAST: CodeWithAST, cursor: Range) =>
  baseActionCreators
    .map((actionCreator) =>
      typeof actionCreator == "function"
        ? actionCreator(codeWithAST, cursor)
        : actionCreator
    )
    .filter((a) => !!a);

const groupByType = (actions: Action[]): Record<string, Action[]> => {
  const grouped = {};
  for (const action of actions) {
    if (!action.info) {
      continue;
    }
    const { type } = action.info;
    grouped[type] ||= [];
    grouped[type].push(action);
  }
  return grouped;
};

export type Action = BaseAction | NodeAction;

export const findActions = (codeWithAST: CodeWithAST, cursor: Range) => ({
  base: groupByType(getBaseActions(codeWithAST, cursor)),
  nodes: codeWithAST.ast
    ? findNodeActions(codeWithAST, cursor).map(({ node, actions }) => ({
        node,
        actions: groupByType(actions),
      }))
    : [],
});

export function findAction(
  codeWithAST: CodeWithAST,
  cursor: Range,
  event: KeyboardEvent
) {
  for (const action of getBaseActions(codeWithAST, cursor)) {
    if (
      action.on &&
      ("code" in action.on
        ? action.on.code === event.code
        : action.on.key === event.key) &&
      modifierKeys.every((key) =>
        key in action.on ? action.on[key] == event[key] : true
      )
    ) {
      return () => action.do(codeWithAST, cursor, event.shiftKey);
    }
  }

  for (const { actions } of findNodeActions(codeWithAST, cursor)) {
    for (const action of actions) {
      if (
        "code" in action.on
          ? action.on.code === event.code
          : action.on.key === event.key
      ) {
        return () => action.do();
      }
    }
  }

  return null;
}
