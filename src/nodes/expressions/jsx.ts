import * as t from "@babel/types";

import { getNode, getNodeFromPath } from "../../ast-utils";
import { selectNode, selectNodeFromPath } from "../../cursor/utils";
import { DetailAction, Range, SelectionContext } from "../../utils";
import { NodeDefs, OnNodeInput, wrappers } from "../utils";

const handleFragmentInput: OnNodeInput<
  t.JSXOpeningFragment | t.JSXClosingFragment
> = ({ node, path, code, cursor }, data) =>
  cursor.isSingle() && {
    ast(ast) {
      const id = t.jsxIdentifier(data);
      const parent = getNodeFromPath(ast, path.slice(0, -1)) as t.JSXFragment;
      (getNodeFromPath(ast, path.slice(0, -2)) as any)[
        path[path.length - 2]
      ] = t.jsxElement(
        t.jsxOpeningElement(id, []),
        t.jsxClosingElement(id),
        parent.children
      );
    },
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

// const shortenElementNameActions: DetailAction<t.JSXOpeningElement | t.JSXClosingElement>[]=
//   !(t.isJSXOpeningElement(node) && node.selfClosing) &&
//   isInName(node, cursor) &&
//   t.isJSXIdentifier(node.name) &&
//   (["Backspace", "Delete"] as const).map((keyCode) => ({
//     on: { code: keyCode },
//     do: () => ({
//       ast(ast) {
//         const { name } = node.name as t.JSXIdentifier;
//         changeElementName(
//           ast,
//           path,
//           name.slice(
//             0,
//             cursor.start -
//               node.name.start! -
//               (keyCode == "Backspace" && cursor.isSingle() ? 1 : 0)
//           ) +
//             name.slice(
//               cursor.end -
//                 node.name.start! +
//                 (keyCode == "Delete" && cursor.isSingle() ? 1 : 0)
//             )
//         );
//       },
//       cursor: (newCode) =>
//         new Range(
//           (getNodeFromPath(newCode.ast, path) as typeof node).name.start! +
//             (cursor.start - node.name.start!) -
//             (keyCode == "Backspace" && cursor.isSingle() ? 1 : 0)
//         ),
//     }),
// }

const handleElementInput: OnNodeInput<
  t.JSXOpeningElement | t.JSXClosingElement
> = ({ node, path, cursor }, text) => {
  if (
    text == " " ||
    !t.isJSXIdentifier(node.name) ||
    !isInName(node, cursor) ||
    (t.isJSXOpeningElement(node) && node.selfClosing)
  ) {
    return false;
  }
  const nodeIdentifier = node.name;
  const offset = cursor.start - nodeIdentifier.start! + text.length;
  return {
    ast(ast) {
      const nameStart = nodeIdentifier.start!;
      const newName =
        nodeIdentifier.name.slice(0, cursor.start - nameStart) +
        text +
        nodeIdentifier.name.slice(cursor.end - nameStart);
      changeElementName(ast, path, newName);
    },
    cursor: (code) =>
      new Range(
        (getNodeFromPath(code.ast, [
          ...path.slice(0, -1),
          t.isJSXOpeningElement(node) ? "openingElement" : "closingElement",
          "name",
        ]) as t.Node).start! + offset
      ),
  };
};

function isAtOpeningTagEnd({
  node,
  cursor: { start },
}: SelectionContext<t.JSXOpeningElement>) {
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
    hasSlot({ node, cursor }) {
      const pos = cursor.start - node.start!;
      const { value } = node;
      return !!value.slice(0, pos).trim() || !!value[pos].trim();
    },
    actions: [
      {
        id: "makeExpression",
        on: { at: () => true, char: "{" },
        do: ({ cursor }) => ({
          sourceReplace: [cursor, "{}"],
          cursor: () => new Range(cursor.start + 1),
        }),
      },
    ],
  },

  JSXFragment: {
    hasSlot: ({ node, cursor }) => node.openingFragment.end! == cursor.start,
  },
  JSXOpeningFragment: {
    hasSlot: ({ node, cursor }) => node.start! + 1 == cursor.start,
    onInput: handleFragmentInput,
  },
  JSXClosingFragment: {
    hasSlot: ({ node, cursor }) => node.start! + 2 == cursor.start,
    onInput: handleFragmentInput,
  },

  //   JSXElement: {
  //     // hasSlot: (node, start) => node.openingElement.end! == start,
  //     actions: [
  //       {
  //         on: { char: "{" },
  //         do: () => ({
  //           sourceReplace: [cursor, "{}"],
  //           cursor: () => new Range(cursor.start + 1),
  //         }),
  //       },
  //     ],
  //   },
  JSXOpeningElement: {
    hasSlot: isAtOpeningTagEnd,
    actions: [
      //   shortenElementNameActions({ node, leafNode, path, code, cursor }),
      //   isAtOpeningTagEnd(node, cursor.start) && {
      //     on: node.selfClosing
      //       ? [{ code: "Backspace" }, { code: "Delete" }]
      //       : { key: "/" },
      //     do: () => ({
      //       ast(ast) {
      //         const parent = getNodeFromPath(
      //           ast,
      //           path.slice(0, -1)
      //         ) as t.JSXElement;
      //         if (node.selfClosing) {
      //           node.selfClosing = false;
      //           parent.closingElement = t.jsxClosingElement(node.name);
      //         } else {
      //           node.selfClosing = true;
      //           parent.closingElement = null;
      //         }
      //       },
      //       cursor(code) {
      //         const newNode = getNodeFromPath(code.ast, path) as typeof node;
      //         return newNode.selfClosing
      //           ? new Range(newNode.end! - 2, newNode.end! - 1)
      //           : new Range(newNode.end! - 1);
      //       },
      //     }),
      //   },
    ],
    onInput: handleElementInput,
  },
  JSXClosingElement: {
    // actions: shortenElementNameActions,
    onInput: handleElementInput,
  },

  JSXAttribute: {
    actions: [
      {
        id: "assign",
        if: ({ node }) => !node.value,
        on: { at: ({ node, cursor }) => cursor.start == node.end!, char: "=" },
        do: ({ node, path }) => ({
          sourceReplace: [new Range(node.end!), '=""'],
          cursor: (code) =>
            new Range(
              (getNodeFromPath(code.ast, path) as typeof node).value!.start! + 1
            ),
        }),
      },
      ...wrappers.map(
        ({ type, char, wrap, cursor }) =>
          ({
            id: ["wrap", type],
            if: ({ node }) => t.isStringLiteral(node.value),
            on: {
              at: ({ node, cursor }) => node.value && cursor.equals(node.value),
              char,
            },
            do: ({ node, path }) => ({
              sourceReplace: [selectNode(node.value!), "{" + wrap("") + "}"],
              cursor: (code, newCursor) => {
                const subPath = [...path, "value", "expression"];
                return cursor({
                  node: getNodeFromPath(code.ast, subPath) as any,
                  path: subPath,
                  code,
                  cursor: newCursor,
                });
              },
            }),
          } as DetailAction<t.JSXAttribute>),
        {}
      ),
    ],
    onInput: ({ node, cursor }, data) =>
      t.isStringLiteral(node.value) &&
      cursor.equals(node.value) && {
        sourceReplace: [cursor, `{${data}}`],
        cursor: new Range(node.value.start! + 1 + data.length),
      },
  },

  JSXExpressionContainer: {
    hasSlot: ({ node, cursor: { start } }) =>
      node.start! == start || node.end! == start,
  },
  JSXEmptyExpression: {
    hasSlot: ({ node, cursor }) => node.start == cursor.start,
  },
};
