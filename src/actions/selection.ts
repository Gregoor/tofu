import { buildActionCreators, isMac, withAST } from "./utils";
import { Range } from "../utils";

export const selectionActions = buildActionCreators([
  {
    on: {
      key: "a",
      ...(isMac ? { metaKey: true } : { ctrlKey: true }),
    },
    do: ({ code }) => () => ({ cursor: new Range(0, code.length) }),
  },

  ...([
    ["LEFT", "ArrowLeft"],
    ["RIGHT", "ArrowRight"],
    ["UP", "ArrowUp"],
    ["DOWN", "ArrowDown"],
  ] as const).map(([direction, key]) => ({
    info: { type: "RANGE_SELECT", direction } as const,
    on: { key, shiftKey: true },
    do: withAST(() => () => ({ rangeSelect: direction })),
  })),
]);
