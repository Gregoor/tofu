import generate from "@babel/generator";
import t from "@babel/types";

import { getNode, getNodeFromPath, getParentsAndPathTD } from "./ast-utils";
import { Code, ValidCode, codeFromSource } from "./code";
import { moveCursor } from "./cursor/move";
import { selectName, selectNode } from "./cursor/utils";
import { findNodeActions } from "./nodes";
import { NodeAction } from "./nodes/utils";
import { Change, KeyConfig, Range, modifierKeys } from "./utils";

type BaseAction = {
  info?: any;
  on?: KeyConfig;
  do: (code: Code, cursor: Range, isShifted?: boolean) => null | Change<Code>;
};

export const isMac = navigator.platform.startsWith("Mac");

type Keyword = {
  name: string;
  label?: string;
  create: (child?: string) => string;
  getInitialCursor: (ast: t.File, path: (string | number)[]) => Range;
  canWrapStatement: boolean;
  hidden?: boolean;
};

const keywords: Keyword[] = [
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

  ...(["const", "let", "var"] as const).map(
    (kind) =>
      ({
        name: kind,
        create: (initial) =>
          generate(
            t.variableDeclaration(kind, [
              t.variableDeclarator(
                t.identifier("n"),
                initial || ((kind == "const" ? t.nullLiteral() : null) as any)
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
      } as Keyword)
  ),
];

type BaseActionCreator = (code: Code, cursor: Range) => BaseAction | null;
const baseActionCreators: (BaseAction | BaseActionCreator)[] = [
  ...([
    ["ArrowLeft", "LEFT"],
    ["ArrowRight", "RIGHT"],
    ["ArrowUp", "UP"],
    ["ArrowDown", "DOWN"],
  ] as const).map(
    ([key, direction]) =>
      ({
        on: { key, shiftKey: false },
        do: (code, cursor) => ({
          cursor: moveCursor(code, cursor, direction),
        }),
      } as BaseAction)
  ),

  {
    on: isMac ? { code: "ArrowLeft", metaKey: true } : { code: "Home" },
    do: () => ({}),
  },
  {
    on: isMac ? { code: "ArrowRight", metaKey: true } : { code: "End" },
    do: () => ({}),
  },

  (code, { start, end }) => {
    const node = code instanceof ValidCode && getNode(code.ast, start);
    if (!node) {
      return null;
    }
    return {
      on: { code: "Tab" },
      do: (_1, _2, isShifted) => ({
        cursor: isShifted
          ? moveCursor(code, new Range(node.start!), "LEFT")
          : moveCursor(
              code,
              new Range(start == end ? node.end! : end),
              "RIGHT"
            ),
      }),
    };
  },

  {
    on: { code: "Enter" },
    do: (code, { start }, isShifted) => {
      const accuCharCounts = (code.source.split("\n") as string[])
        .map((s, i) => s.length + (i == 0 ? 0 : 1))
        .reduce<number[]>(
          (accu, n) => [...accu, (accu[accu.length - 1] || 0) + n],
          []
        );
      let index = accuCharCounts.findIndex(
        (n) => n >= start - 2 // I don't quite get this one
      );
      if (isShifted && index > 0) {
        index -= 1;
      }
      const pos = index == -1 ? 0 : accuCharCounts[index];
      return {
        code: code.replaceSource(new Range(pos), "\n"),
        cursor: new Range(pos == 0 ? 0 : pos + 1),
        skipFormatting: true,
      };
    },
  },

  {
    on: { code: "Backspace" },
    do: ({ source }, { start, end }) => ({
      code: codeFromSource(
        source.slice(0, start === end ? start - 1 : start) + source.slice(end)
      ),
      cursor: moveCursor(
        codeFromSource(
          source.slice(0, start === end ? start - 1 : start) + source.slice(end)
        ),
        new Range(start, end),
        "LEFT"
      ),
    }),
  },

  {
    on: { code: "Delete" },
    do: ({ source }, { start, end }) => ({
      code: codeFromSource(
        source.slice(0, start) + source.slice(start === end ? end + 1 : end)
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
    do: ({ source }) => ({ cursor: new Range(0, source.length) }),
  },

  ...([
    ["LEFT", "ArrowLeft"],
    ["RIGHT", "ArrowRight"],
    ["UP", "ArrowUp"],
    ["DOWN", "ArrowDown"],
  ] as const).map(
    ([direction, keyCode]) =>
      ((code) =>
        code.isValid()
          ? {
              info: { type: "RANGE_SELECT", direction } as const,
              on: { code: keyCode, shiftKey: true },
              do: () => ({ rangeSelect: direction }),
            }
          : null) as BaseActionCreator
  ),

  ...keywords.map(
    ({ name, create, getInitialCursor }) =>
      ((code, { start }) => {
        if (
          code.source.slice(start - name.length, start) != name ||
          code.source[start + 1] != "\n"
        ) {
          return null;
        }
        return {
          on: { code: "Space" },
          do: () => ({
            code: code.replaceSource(
              new Range(start - name.length, start),
              create()
            ),
            nextCursor: (code, cursor) =>
              code.isValid()
                ? getInitialCursor(
                    code.ast,
                    getParentsAndPathTD(code.ast, start)[1]
                  )
                : cursor,
          }),
        };
      }) as BaseActionCreator
  ),
];

export const getBaseActions = (code: Code, cursor: Range) =>
  baseActionCreators
    .map((actionCreator) =>
      typeof actionCreator == "function"
        ? actionCreator(code, cursor)
        : actionCreator
    )
    .filter((a) => !!a) as BaseAction[];

const groupByType = (actions: Action[]): Record<string, Action[]> => {
  const grouped: any = {};
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

export const findActions = (code: Code, cursor: Range) => ({
  base: groupByType(getBaseActions(code, cursor)),
  nodes: code.isValid()
    ? findNodeActions(code, cursor).map(({ node, actions }) => ({
        node,
        actions: groupByType(actions),
      }))
    : [],
});

export function findAction(code: Code, cursor: Range, event: KeyboardEvent) {
  for (const action of getBaseActions(code, cursor)) {
    if (
      action.on &&
      ("code" in action.on
        ? action.on.code === event.code
        : action.on.key === event.key) &&
      modifierKeys.every((key) =>
        action.on && key in action.on ? action.on[key] == event[key] : true
      )
    ) {
      return () => action.do(code, cursor, event.shiftKey);
    }
  }

  if (!code.isValid()) {
    return;
  }

  for (const { actions } of findNodeActions(code, cursor)) {
    for (const action of actions) {
      if (
        action.on &&
        ("code" in action.on
          ? action.on.code === event.code
          : action.on.key === event.key)
      ) {
        return () => action.do();
      }
    }
  }

  return null;
}
