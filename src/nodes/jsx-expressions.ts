import * as t from "@babel/types";

import { getNodeFromPath } from "../ast-utils";
import { Range } from "../utils";
import {
  NodeActionParams,
  NodeDefs,
  NodeDetailActions,
  OnNodeInput,
} from "./utils";

const handleFragmentInput: OnNodeInput<
  t.JSXOpeningFragment | t.JSXClosingFragment
> = ({ node, path, code, cursor }, data) =>
  cursor.isSingle() && {
    code: code.mutateAST((ast) => {
      const id = t.jsxIdentifier(data);
      const parent = getNodeFromPath(ast, path.slice(0, -1)) as t.JSXFragment;
      (getNodeFromPath(ast, path.slice(0, -2)) as any)[
        path[path.length - 2]
      ] = t.jsxElement(
        t.jsxOpeningElement(id, []),
        t.jsxClosingElement(id),
        parent.children
      );
    }),
    cursor: (code) =>
      new Range(
        (getNodeFromPath(code.ast, [
          ...path.slice(0, -1),
          t.isJSXOpeningFragment(node) ? "openingElement" : "closingElement",
          "name",
        ]) as t.Node).end!
      ),
  };

function changeElementName(
  ast: t.File,
  path: (string | number)[],
  newName: string
) {
  const id = t.jsxIdentifier(newName);
  const parent = getNodeFromPath(ast, path.slice(0, -1)) as t.JSXElement;
  (getNodeFromPath(ast, path.slice(0, -2)) as any)[
    path[path.length - 2]
  ] = newName
    ? t.jsxElement(
        t.jsxOpeningElement(id, parent.openingElement.attributes),
        t.jsxClosingElement(id),
        parent.children
      )
    : t.jsxFragment(
        t.jsxOpeningFragment(),
        t.jsxClosingFragment(),
        parent.children
      );
}

const isInName = (
  node: t.JSXOpeningElement | t.JSXClosingElement,
  cursor: Range
) => node.name.start! <= cursor.start && node.name.end! >= cursor.end;

const shortenElementNameActions: (
  params: NodeActionParams<t.JSXOpeningElement | t.JSXClosingElement>
) => NodeDetailActions = ({ node, path, code, cursor }) =>
  !(t.isJSXOpeningElement(node) && node.selfClosing) &&
  isInName(node, cursor) &&
  t.isJSXIdentifier(node.name) &&
  (["Backspace", "Delete"] as const).map((keyCode) => ({
    on: { code: keyCode },
    do: () => ({
      code: code.mutateAST((ast) => {
        const { name } = node.name as t.JSXIdentifier;
        changeElementName(
          ast,
          path,
          name.slice(
            0,
            cursor.start -
              node.name.start! -
              (keyCode == "Backspace" && cursor.isSingle() ? 1 : 0)
          ) +
            name.slice(
              cursor.end -
                node.name.start! +
                (keyCode == "Delete" && cursor.isSingle() ? 1 : 0)
            )
        );
      }),
      cursor: (newCode) =>
        new Range(
          (getNodeFromPath(newCode.ast, path) as typeof node).name.start! +
            (cursor.start - node.name.start!) -
            (keyCode == "Backspace" && cursor.isSingle() ? 1 : 0)
        ),
    }),
  }));

const handleElementInput: OnNodeInput<
  t.JSXOpeningElement | t.JSXClosingElement
> = ({ node, path, code, cursor }, data) => {
  if (
    !t.isJSXIdentifier(node.name) ||
    !isInName(node, cursor) ||
    (t.isJSXOpeningElement(node) && node.selfClosing)
  ) {
    return false;
  }
  const nodeIdentifier = node.name;
  return {
    code: code.mutateAST((ast) => {
      const nameStart = nodeIdentifier.start!;
      const newName =
        nodeIdentifier.name.slice(0, cursor.start - nameStart) +
        data +
        nodeIdentifier.name.slice(cursor.end - nameStart);
      changeElementName(ast, path, newName);
    }),
    cursor: (code) =>
      new Range(
        (getNodeFromPath(code.ast, [
          ...path.slice(0, -1),
          t.isJSXOpeningElement(node) ? "openingElement" : "closingElement",
          "name",
        ]) as t.Node).end!
      ),
  };
};

function isAtOpeningTagEnd(node: t.JSXOpeningElement, start: number) {
  const end = node.end!;
  if (node.selfClosing) {
    if (start == end - 2) {
      return new Range(end - 2, end - 1);
    }
    return start == end - 1;
  }
  return start == end - 1;
}

export const jsxExpressions: NodeDefs = {
  JSXIdentifier: { hasSlot: () => true },
  JSXText: {
    hasSlot: (node) => !!node.value.trim(),
    actions: ({ code, cursor }) => ({
      on: { key: "{" },
      do: () => ({
        code: code.replaceSource(cursor, "{}"),
        cursor: () => new Range(cursor.start + 1),
      }),
    }),
  },

  JSXFragment: {
    hasSlot: (node, start) => node.openingFragment.end! == start,
  },
  JSXOpeningFragment: {
    hasSlot: (node, start) => node.start! + 1 == start,
    onInput: handleFragmentInput,
  },
  JSXClosingFragment: {
    hasSlot: (node, start) => node.start! + 2 == start,
    onInput: handleFragmentInput,
  },

  JSXElement: {
    hasSlot: (node, start) => node.openingElement.end! == start,
    actions: ({ code, cursor }) => ({
      on: { key: "{" },
      do: () => ({
        code: code.replaceSource(cursor, "{}"),
        cursor: () => new Range(cursor.start + 1),
      }),
    }),
  },
  JSXOpeningElement: {
    hasSlot: isAtOpeningTagEnd,
    actions: ({ node, path, code, cursor }) => [
      shortenElementNameActions({ node, path, code, cursor }),
      isAtOpeningTagEnd(node, cursor.start) && {
        on: node.selfClosing
          ? [{ code: "Backspace" }, { code: "Delete" }]
          : { key: "/" },
        do: () => ({
          code: code.mutateAST((ast) => {
            const parent = getNodeFromPath(
              ast,
              path.slice(0, -1)
            ) as t.JSXElement;
            if (node.selfClosing) {
              node.selfClosing = false;
              parent.closingElement = t.jsxClosingElement(node.name);
            } else {
              node.selfClosing = true;
              parent.closingElement = null;
            }
          }),
          cursor(code) {
            const newNode = getNodeFromPath(code.ast, path) as typeof node;
            return newNode.selfClosing
              ? new Range(newNode.end! - 2, newNode.end! - 1)
              : new Range(newNode.end! - 1);
          },
        }),
      },
    ],
    onInput: handleElementInput,
  },
  JSXClosingElement: {
    actions: shortenElementNameActions,
    onInput: handleElementInput,
  },

  JSXAttribute: {
    actions: ({ node, path, code, cursor }) =>
      cursor.start == node.end! &&
      !node.value && {
        on: { key: "=" },
        do: () => ({
          code: code.replaceSource(cursor, '=""'),
          cursor: (code) =>
            new Range(
              (getNodeFromPath(code.ast, path) as typeof node).value!.start! + 1
            ),
        }),
      },
    onInput: ({ node, path, code, cursor }, data) =>
      t.isStringLiteral(node.value) &&
      cursor.equals(node.value) && {
        code: code.replaceSource(cursor, `{${data}}`),
        cursor: new Range(node.value.start! + 1 + data.length),
      },
  },

  JSXExpressionContainer: {
    hasSlot: (node, start) => node.start! == start || node.end! == start,
  },
  JSXEmptyExpression: {
    hasSlot: (node, start) => node.start == start,
  },
};
