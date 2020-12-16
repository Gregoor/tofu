import t from "@babel/types";

import { getNode, getNodeFromPath } from "../ast-utils";
import { ValidCode } from "../code";
import { selectNodeFromPath } from "../cursor/utils";
import { Change, KeyConfig, Range } from "../utils";

export type NodeAction = {
  info?: any;
  on?: KeyConfig | KeyConfig[];
  do: () => Change<ValidCode>;
};
export type NodeActions = false | null | NodeAction | NodeActions[];

export type NodeHasSlot<T> = (
  node: T,
  start: number,
  code: ValidCode
) => boolean | Range;

export type NodeActionParams<T> = {
  node: T;
  path: (string | number)[];
  cursor: Range;
  code: ValidCode;
};

export type OnNodeInput<T> = (
  params: NodeActionParams<T>,
  data: string
) => false | Change<ValidCode>;

export type NodeDef<T> = {
  hasSlot?: NodeHasSlot<T>;
  actions?: (params: NodeActionParams<T>) => NodeActions;
  onInput?: OnNodeInput<T>;
};

export type NodeDefs = Partial<
  {
    [T in t.Node["type"]]: NodeDef<Extract<t.Node, { type: T }>>;
  }
>;

export function findSlotIndex(collection: any[], start: number) {
  let index = collection.findIndex((n) => n && n.start > start);
  if (index == -1) {
    index = collection.length;
  }
  return index;
}

export const addElementAction = (
  { node, path, code, cursor: { start, end } }: NodeActionParams<t.Node>,
  collectionKey: string,
  initialValue: t.Node
): NodeActions =>
  start > node.start! &&
  end < node.end! && {
    info: { type: "ADD_ELEMENT" },
    on: { key: "," },
    do: () => {
      let index = findSlotIndex((node as any)[collectionKey], start);
      if (
        (start == node.start && end == node.start) ||
        getNode(code.ast, start).start == start
      ) {
        index = Math.max(0, index - 1);
      }

      return {
        code: code.mutateAST((ast) => {
          const collection = getNodeFromPath(ast, path) as any;
          collection[collectionKey].splice(index, 0, initialValue);
        }),
        nextCursor: ({ ast }) =>
          selectNodeFromPath(ast, [...path, collectionKey, index]),
      };
    },
  };

export const flattenActions = (actions: NodeActions): NodeAction[] =>
  (Array.isArray(actions) ? actions : [actions]).flat(Infinity);
