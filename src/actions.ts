import generate from "@babel/generator";
import t from "@babel/types";

import { getLineage } from "./ast-utils";
import { Code, codeFromSource, isValid } from "./code";
import { moveCursor } from "./cursor/move";
import {
  selectNameFromPath,
  selectNode,
  selectNodeFromPath,
} from "./cursor/utils";
import { findNodeDetailActions, handleNodeInput } from "./nodes";
import { reportError } from "./report";
import {
  BareAction,
  BareChange,
  BareDetailAction,
  DetailAction,
  Range,
  modifierKeys,
} from "./utils";

type BaseDetailAction = {
  if?: (code: Code, cursor: Range) => boolean;
} & BareDetailAction<Code>;

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
            ]) as any
          ).code,
        getInitialCursor: (ast, path) =>
          selectNameFromPath(ast, [...path, "declarations", "0", "id"]),
        canWrapStatement: false,
      } as Keyword)
  ),
];

const baseDetailActions: BaseDetailAction[] = [
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
      } as BaseDetailAction)
  ),

  // {
  //   on: isMac ? { code: "ArrowLeft", metaKey: true } : { code: "Home" },
  //   do: () => ({}),
  // },
  // {
  //   on: isMac ? { code: "ArrowRight", metaKey: true } : { code: "End" },
  //   do: () => ({}),
  // },

  ...keywords.map(
    ({ name, create, getInitialCursor }) =>
      ({
        if: (code, { start }) =>
          code.source.slice(start - name.length, start) != name ||
          code.source[start + 1] != "\n",
        on: { code: "Space" },
        do: (code, { start }) => ({
          code: code.replaceSource(
            new Range(start - name.length, start),
            create("")
          ),
          cursor: (code, cursor) =>
            isValid(code)
              ? getInitialCursor(
                  code.ast,
                  getLineage(code.ast, start).pop()![1]
                )
              : cursor,
        }),
      } as BaseDetailAction)
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
      ({
        if: (code) => isValid(code),
        info: { type: "RANGE_SELECT", direction } as const,
        on: { code: keyCode, shiftKey: true, altKey: false },
        do: () => ({ rangeSelect: direction }),
      } as BaseDetailAction)
  ),

  {
    if: (code) => isValid(code),
    info: { type: "STRETCH" } as const,
    on: { code: "ArrowUp", altKey: true },
    do: (code, cursor) => {
      if (!isValid(code)) {
        return;
      }
      const nodes = getLineage(code.ast, cursor.start).reverse();
      const selectedNodeIndex = nodes.findIndex(
        ([node]) => node.start! <= cursor.start && node.end! >= cursor.end
      );
      if (selectedNodeIndex == -1) {
        reportError(
          new Error("Assertion: there should always be a selected node")
        );
        return;
      }
      const [selectedNode] = nodes[selectedNodeIndex];
      const typeCheck = [t.isExpression, t.isStatement].find((test) =>
        test(selectedNode)
      );
      if (!typeCheck) {
        return;
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
        return;
      }
      const [parentNode, parentPath] = result;
      return {
        code: code.replaceSource(
          selectNode(parentNode),
          code.source.slice(selectedNode.start!, selectedNode.end!)
        ),
        cursor: (code, cursor) => {
          if (isValid(code)) {
            return selectNodeFromPath(code.ast, parentPath);
          } else {
            reportError(
              new Error("Assertion: move out should always generate valid code")
            );
            return cursor;
          }
        },
      };
    },
  },
];

export const getBaseDetailActions = (code: Code, cursor: Range) =>
  baseDetailActions.filter(
    (a) => !a.if || a.if(code, cursor)
  ) as BaseDetailAction[];

const groupByType = (
  detailActions: DetailAction[]
): Record<string, DetailAction[]> => {
  const grouped: any = {};
  for (const detailAction of detailActions) {
    if (!detailAction.info) {
      continue;
    }
    const { type } = detailAction.info;
    grouped[type] ||= [];
    grouped[type].push(detailAction);
  }
  return grouped;
};

export const findDetailActions = (code: Code, cursor: Range) => ({
  base: groupByType(getBaseDetailActions(code, cursor)),
  nodes: isValid(code)
    ? findNodeDetailActions(code, cursor).map(({ node, actions }) => ({
        node,
        actions: groupByType(actions as any),
      }))
    : [],
});

function isActionOn(on: DetailAction["on"], event: KeyboardEvent) {
  return (
    on &&
    (Array.isArray(on) ? on : [on]).some(
      (on) =>
        ("code" in on ? on.code === event.code : on.key === event.key) &&
        modifierKeys.every((key) =>
          on && key in on ? on[key] == event[key] : true
        )
    )
  );
}

export function findAction(
  code: Code,
  cursor: Range,
  event: KeyboardEvent
): undefined | BareAction<Code> {
  if (isValid(code)) {
    const action = findNodeDetailActions(code, cursor)
      .map(({ actions }) => actions)
      .flat()
      .find((action) => isActionOn(action.on, event));
    if (action) {
      return action.do as any;
    }
  }

  for (const action of getBaseDetailActions(code, cursor)) {
    if (isActionOn(action.on, event)) {
      return () => action.do(code, cursor);
    }
  }
}

export function handleInput(
  code: Code,
  cursor: Range,
  data: string
): BareChange<any> {
  const change = isValid(code) && handleNodeInput(code, cursor, data);
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
