import t from "@babel/types";

import { getNodeFromPath } from "../ast-utils";
import { Range } from "../utils";
import { NodeDefs, OnNodeInput } from "./utils";

const handleFragmentInput: OnNodeInput<
  t.JSXOpeningFragment | t.JSXClosingFragment
> = ({ node, path, code, cursor }, data) =>
  cursor.isSingle() && {
    code: code.mutateAST((ast) => {
      const id = t.jsxIdentifier(data);
      (getNodeFromPath(ast, path.slice(0, -2)) as any)[
        path[path.length - 2]
      ] = t.jsxElement(
        t.jsxOpeningElement(id, []),
        t.jsxClosingElement(id),
        []
      );
    }),
    nextCursor: (code) =>
      new Range(
        getNodeFromPath(code.ast, [
          ...path.slice(0, -1),
          t.isJSXOpeningFragment(node) ? "openingElement" : "closingElement",
          "name",
        ]).end!
      ),
  };

const handleElementInput: OnNodeInput<
  t.JSXOpeningElement | t.JSXClosingElement
> = ({ node, path, code, cursor }, data) => {
  return {
    code: code.mutateAST((ast) => {
      //  TODO: FML I FORGOT ABOUT BACKSPACE/DELETE THOSE F*CKN KEYS DONT LAND HERE
      if (!t.isJSXIdentifier(node.name)) {
        return;
      }
      const nameStart = node.name.start!;
      const newName =
        node.name.name.slice(0, cursor.start - nameStart) +
        data +
        node.name.name.slice(cursor.end - nameStart);
      const id = t.jsxIdentifier(newName);
      const parent = getNodeFromPath(ast, path.slice(0, -1)) as t.JSXElement;
      (getNodeFromPath(ast, path.slice(0, -2)) as any)[
        path[path.length - 2]
      ] = newName
        ? t.jsxElement(
            t.jsxOpeningElement(id, []),
            t.jsxClosingElement(id),
            parent.children
          )
        : t.jsxFragment(
            t.jsxOpeningFragment(),
            t.jsxClosingFragment(),
            parent.children
          );
    }),
    nextCursor: (code) =>
      new Range(
        getNodeFromPath(code.ast, [
          ...path.slice(0, -1),
          t.isJSXOpeningElement(node) ? "openingElement" : "closingElement",
          "name",
        ]).end!
      ),
  };
};

export const jsxExpressions: NodeDefs = {
  JSXIdentifier: { hasSlot: () => true },
  JSXText: { hasSlot: () => true },

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
  },
  JSXOpeningElement: {
    onInput: handleElementInput,
  },
  JSXClosingElement: {
    onInput: handleElementInput,
  },
};
