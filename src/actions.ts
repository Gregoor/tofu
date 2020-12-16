import generate from "@babel/generator";
import t from "@babel/types";

import { getLineage } from "./ast-utils";
import { Code, codeFromSource } from "./code";
import { moveCursor } from "./cursor/move";
import {
  selectNameFromPath,
  selectNode,
  selectNodeFromPath,
} from "./cursor/utils";
import { findNodeActions, handleNodeInput } from "./nodes";
import { NodeAction } from "./nodes/utils";
import {
  Change,
  KeyConfig,
  Range,
  justLogErrorButInTheFutureThisWillNeedToReportToSentry,
  modifierKeys,
} from "./utils";

type BaseAction = {
  info?: any;
  on?: KeyConfig;
  do: (code: Code, cursor: Range) => null | Change<Code>;
};

export const isMac = navigator.platform.startsWith("Mac");

function isAtLineStart(source: string, start: number) {
  const reverseBreakIndex = source
    .slice(0, start + 1)
    .split("")
    .reverse()
    .findIndex((char) => char == "\n");
  const sourceFromStartOfLine = source.slice(
    start - (reverseBreakIndex || start),
    start
  );
  return !sourceFromStartOfLine.trim();
}

type Keyword = {
  name: string;
  label?: string;
  create: (child: string) => string;
  getInitialCursor: (ast: t.File, path: (string | number)[]) => Range;
  canWrapStatement: boolean;
  hidden?: boolean;
};

const keywords: Keyword[] = [
  {
    name: "if",
    create: (child) => `if (someCondition) { ${child} }`,
    getInitialCursor: (ast, path) => selectNameFromPath(ast, [...path, "test"]),
    canWrapStatement: true,
  },
  {
    name: "for",
    label: "for...of",
    create: (child) => `for (const item of iterable) { ${child} }`,
    getInitialCursor: (ast, path) =>
      selectNameFromPath(ast, [...path, "left", "declarations", "0", "id"]),
    canWrapStatement: true,
  },

  {
    name: "function",
    create: () => "function fn() {}",
    getInitialCursor: (ast, path) => selectNodeFromPath(ast, [...path, "id"]),
    hidden: true,
    canWrapStatement: true,
  },
  {
    name: "return",
    create: () => "return null;",
    getInitialCursor: (ast, path) =>
      selectNodeFromPath(ast, [...path, "argument"]),
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
          selectNameFromPath(ast, [...path, "declarations", "0", "id"]),
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
        on: { key, shiftKey: false, altKey: false },
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
              create("")
            ),
            nextCursor: (code, cursor) =>
              code.isValid()
                ? getInitialCursor(
                    code.ast,
                    getLineage(code.ast, start).pop()![1]
                  )
                : cursor,
          }),
        };
      }) as BaseActionCreator
  ),
  {
    on: { code: "Space" },
    do: (code, cursor) => ({
      code: code.replaceSource(cursor, " "),
      cursor: new Range(cursor.start + 1),
      skipFormatting: true,
    }),
  },

  {
    on: { code: "Enter" },
    do(code, { start }) {
      let pos: number = 0;
      if (isAtLineStart(code.source, start)) {
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
    ["UP", "ArrowUp"],
    ["DOWN", "ArrowDown"],
    ["LEFT", "ArrowLeft"],
    ["RIGHT", "ArrowRight"],
  ] as const).map(
    ([direction, keyCode]) =>
      ((code) =>
        code.isValid()
          ? {
              info: { type: "RANGE_SELECT", direction } as const,
              on: { code: keyCode, shiftKey: true, altKey: false },
              do: () => ({ rangeSelect: direction }),
            }
          : null) as BaseActionCreator
  ),

  (code) =>
    code.isValid()
      ? {
          info: { type: "STRETCH" } as const,
          on: { code: "ArrowUp", altKey: true },
          do: (_, cursor) => {
            const nodes = getLineage(code.ast, cursor.start).reverse();
            const selectedNodeIndex = nodes.findIndex(
              ([node]) => node.start! <= cursor.start && node.end! >= cursor.end
            );
            if (selectedNodeIndex == -1) {
              justLogErrorButInTheFutureThisWillNeedToReportToSentry(
                new Error("Assertion: there should always be a selected node")
              );
              return {};
            }
            const [selectedNode] = nodes[selectedNodeIndex];
            const typeCheck = [t.isExpression, t.isStatement].find((test) =>
              test(selectedNode)
            );
            if (!typeCheck) {
              return {};
            }
            const result = nodes
              .slice(selectedNodeIndex + 1)
              .find(
                ([node]) =>
                  typeCheck(node) &&
                  node.start! <= selectedNode.start! &&
                  node.end! >= selectedNode.end!
              );
            if (!result) {
              return {};
            }
            const [parentNode, parentPath] = result;
            return {
              code: code.replaceSource(
                selectNode(parentNode),
                code.source.slice(selectedNode.start!, selectedNode.end!)
              ),
              nextCursor: (code) => {
                if (code.isValid()) {
                  return selectNodeFromPath(code.ast, parentPath);
                } else {
                  justLogErrorButInTheFutureThisWillNeedToReportToSentry(
                    new Error(
                      "Assertion: move out should always generate valid code"
                    )
                  );
                  return {};
                }
              },
            };
          },
        }
      : null,
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

const modifieresPressed = (on: BaseAction["on"], event: KeyboardEvent) =>
  modifierKeys.every((key) => (on && key in on ? on[key] == event[key] : true));

export function findAction(code: Code, cursor: Range, event: KeyboardEvent) {
  if (code.isValid()) {
    const action = findNodeActions(code, cursor)
      .map(({ actions }) => actions)
      .flat()
      .find(
        (action) =>
          action.on &&
          (Array.isArray(action.on) ? action.on : [action.on]).some(
            (on) =>
              ("code" in on ? on.code === event.code : on.key === event.key) &&
              modifieresPressed(on, event)
          )
      );
    if (action) {
      return action.do;
    }
  }

  for (const action of getBaseActions(code, cursor)) {
    if (
      action.on &&
      ("code" in action.on
        ? action.on.code === event.code
        : action.on.key === event.key) &&
      modifieresPressed(action.on, event)
    ) {
      return () => action.do(code, cursor);
    }
  }
}

export function handleInput(
  code: Code,
  cursor: Range,
  data: string
): Change<Code> {
  const change = code.isValid() && handleNodeInput(code, cursor, data);
  if (change) {
    return change;
  }
  const { source } = code;
  const { start, end } = cursor;
  const newSource = source.slice(0, start) + data + source.slice(end);
  const newStart = start + data.length;
  return {
    code: codeFromSource(newSource),
    cursor: new Range(newStart),
  };
}
