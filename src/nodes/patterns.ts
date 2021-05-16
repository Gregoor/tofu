// import * as t from "@babel/types";

import { NodeDefs } from "./utils";

export const patterns: NodeDefs = {
  ArrayPattern: {
    hasSlot: ({ node, cursor }) =>
      node.elements.length == 0 && cursor.start == node.start! + 1,
    // actions: (params) =>
    //   addElementAction(params, "elements", t.identifier("a")),
  },
  ObjectPattern: {
    hasSlot: ({ node, cursor: { start } }) =>
      node.start == start && node.end == start,
  },
};
