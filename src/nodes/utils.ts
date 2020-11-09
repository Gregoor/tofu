import * as t from "@babel/types";

import { CodeWithAST } from "../history";
import { Change, KeyConfig, Range } from "../utils";

export type NodeAction = {
  info?: any;
  on?: KeyConfig;
  do: () => Change;
};
export type NodeActions = NodeAction | NestedActions;

type NestedActions = NodeActions[];

export type NodeHasSlot<T> = (
  node: T,
  start: number,
  codeWithAST: CodeWithAST
) => boolean | Range;

export type NodeActionParams<T> = {
  node: T;
  path: (string | number)[];
  cursor: Range;
  codeWithAST: CodeWithAST;
};

export type NodeDef<T> = {
  hasSlot?: NodeHasSlot<T>;
  actions?: (params: NodeActionParams<T>) => NodeActions;
};

export type NodeDefs = Partial<
  {
    [T in t.Node["type"]]: NodeDef<Extract<t.Node, { type: T }>>;
  }
>;
