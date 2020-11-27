import t from "@babel/types";

import { NodeDefs, addElementAction } from "./utils";

export const misc: NodeDefs = {
  ArrayPattern: {
    hasSlot: (node, start) =>
      node.elements.length == 0 && start == node.start! + 1,
    actions: (params) =>
      addElementAction(params, "elements", t.identifier("a")),
  },
};
