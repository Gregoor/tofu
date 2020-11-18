import t from "@babel/types";

import { ValidCode } from "../code";
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

export type NodeDef<T> = {
  hasSlot?: NodeHasSlot<T>;
  actions?: (params: NodeActionParams<T>) => NodeActions;
};

export type NodeDefs = Partial<
  {
    [T in t.Node["type"]]: NodeDef<Extract<t.Node, { type: T }>>;
  }
>;
