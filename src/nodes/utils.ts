import * as t from "@babel/types";

import { getNodeFromPath } from "../ast-utils";
import { selectNode, selectNodeFromPath } from "../cursor/utils";
import { Change, DetailAction, Range, SelectionContext } from "../utils";

export type OnNodeInput<T> = (
  params: SelectionContext<T>,
  data: string
) => false | Change;

export type NodeDef<T extends t.Node> = {
  hasSlot?: (params: SelectionContext<T>) => boolean | Range;
  actions?: DetailAction<T>[];
  onInput?: OnNodeInput<T>;
};

export type NodeDefs = Partial<
  {
    [T in t.Node["type"]]: NodeDef<Extract<t.Node, { type: T }>>;
  }
>;

export type NodeKindDef<T extends t.Node> = {
  kind: string;
  isKindOf: (params: SelectionContext<t.Node>) => boolean;
  hasSlot: (params: SelectionContext<T>) => boolean | Range;
  actions: DetailAction<T>[];
};

export function findSlotIndex(collection: any[], start: number) {
  let index = collection.findIndex((n) => n && n.start > start);
  if (index == -1) {
    index = collection.length;
  }
  return index;
}

// export const addElementAction = (
//   collectionKey: string,
//   initialValue: t.Node
// ): DetailAction<t.Node> => ({
//   id: "addElement",
//   on: {
//     at: ({ node, leafNode }) =>
//       !(
//         start <= node.start! ||
//         end >= node.end! ||
//         (t.isStringLiteral(leafNode) && start < leafNode.end!) ||
//         t.isTemplateElement(leafNode) ||
//         (t.isIdentifier(leafNode) &&
//           start > leafNode.start! &&
//           start < leafNode.end!)
//       ),

//     char: ",",
//   },

//   do: ({ node, path, code, cursor: { start, end } }) => {
//     let index = findSlotIndex((node as any)[collectionKey], start);
//     if (
//       (start == node.start && end == node.start) ||
//       getNode(code.ast, start).start == start
//     ) {
//       index = Math.max(0, index - 1);
//     }

//     return {
//       ast(ast) {
//         const collection = getNodeFromPath(ast, path) as any;
//         collection[collectionKey].splice(index, 0, initialValue);
//       },
//       cursor: ({ ast }) =>
//         selectNodeFromPath(ast, [...path, collectionKey, index]),
//     };
//   },
// });

export const wrappers: {
  type: string;
  char: string | string[];
  wrap: (source: string) => string;
  cursor: (params: SelectionContext<t.Node>) => Range | null;
}[] = [
  {
    type: "string",
    char: ['"', "'"],
    wrap: (source) => `"${source}"`,
    cursor: ({ node }) =>
      (node as t.StringLiteral).value.length > 0
        ? selectNode(node)
        : new Range(node.start! + 1),
  },
  {
    type: "array",
    char: "[",
    wrap: (source) => `[${source}]`,
    cursor: ({ node }) =>
      (node as t.ArrayExpression).elements.length > 0
        ? selectNode(node)
        : new Range(node.start! + 1),
  },
  {
    type: "object",
    char: "{",
    wrap: (source) => `(${source ? `{key: ${source}}` : "{}"})`,
    cursor: ({ node }) =>
      t.isObjectExpression(node) && node.properties.length > 0
        ? selectNode((node.properties[0] as t.ObjectProperty).key)
        : new Range(node.start! + 1),
  },

  {
    type: "call",
    char: "(",
    wrap: (source) => `fn(${source})`,
    cursor: ({ code, path }) =>
      selectNodeFromPath(code.ast, [...path, "callee"]),
  },
  {
    type: "arrow",
    char: ">",
    wrap: (source) => `() => (${source || "null"})`,
    cursor: ({ code, path }) =>
      new Range(selectNodeFromPath(code.ast, path).start! + 1),
  },
  {
    type: "jsx",
    char: "<",
    wrap: (source) => `<>{${source}}</>`,
    cursor: ({ code, path }) =>
      new Range(selectNodeFromPath(code.ast, path).start! + 1),
  },
];
